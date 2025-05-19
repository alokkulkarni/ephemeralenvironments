import { createPlugin, createRoutableExtension, createApiRef, createRouteRef } from '@backstage/core-plugin-api';
import { scmAuthApiRef } from '@backstage/integration-react';
import { Octokit } from '@octokit/rest';
import { environmentApiRef } from './api';

export const rootRouteRef = createRouteRef({
  id: 'terraform-environments',
});

// Configuration options for the plugin
export interface TerraformEnvironmentsConfig {
  /**
   * Default GitHub organization/owner name to use when not specified in entity annotations
   * @example "my-org"
   */
  defaultOwner: string;

  /**
   * Default GitHub repository name to use when not specified in entity annotations
   * @example "my-repo"
   */
  defaultRepo: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: string;
  labels: Array<{ name: string }>;
  created_at: string;
  updated_at: string;
}

export interface GitHubApi {
  listIssues: (params: { owner: string; repo: string; labels?: string[] }) => Promise<GitHubIssue[]>;
  getIssue: (params: { owner: string; repo: string; number: number }) => Promise<GitHubIssue>;
  createComment: (params: { owner: string; repo: string; number: number; body: string }) => Promise<void>;
  updateIssue: (params: { owner: string; repo: string; number: number; state: string }) => Promise<void>;
  createWorkflowDispatch: (params: { owner: string; repo: string; workflow_id: string; ref: string; inputs: Record<string, string> }) => Promise<void>;
}

export const githubApiRef = createApiRef<GitHubApi>({
  id: 'plugin.terraform-environments.github',
});

// Debug flag - set to true to enable verbose logging
const DEBUG = true;

// Enhanced token retrieval with better handling of token formats
const getGitHubToken = async (scmAuthApi: typeof scmAuthApiRef.T): Promise<string> => {
  if (DEBUG) console.log('Attempting to retrieve GitHub token...');
  
  try {
    // Try specific scopes first
    const response = await scmAuthApi.getCredentials({
      url: 'https://github.com',
      additionalScope: {
        repoWrite: true,
        customScopes: {
          github: ['workflow', 'repo'],
        },
      },
    });
    
    if (DEBUG) console.log('GitHub token response type:', typeof response);
    
    // Check if response is a valid token
    if (!response) {
      throw new Error('Empty authentication response');
    }
    
    // If response is an object with a token property
    if (typeof response === 'object' && response.token) {
      if (DEBUG) console.log('Retrieved token from object.token property');
      return response.token;
    }
    
    // If response is a string
    if (typeof response === 'string') {
      if (DEBUG) console.log('Retrieved token as string');
      return response;
    }
    
    // If response is some other format we don't understand
    throw new Error(`Unexpected token format: ${typeof response}`);
  
  } catch (error) {
    if (DEBUG) console.error('Error retrieving GitHub token:', error);
    
    try {
      // Fallback to basic GitHub auth without specific scopes
      if (DEBUG) console.log('Trying fallback auth method...');
      const response = await scmAuthApi.getCredentials({
        url: 'https://github.com',
      });
      
      if (!response) {
        throw new Error('Empty fallback authentication response');
      }
      
      // Handle object with token property
      if (typeof response === 'object' && response.token) {
        if (DEBUG) console.log('Retrieved fallback token from object.token property');
        return response.token;
      }
      
      // Handle string response
      if (typeof response === 'string') {
        if (DEBUG) console.log('Retrieved fallback token as string');
        return response;
      }
      
      throw new Error(`Unexpected fallback token format: ${typeof response}`);
    } catch (fallbackError) {
      if (DEBUG) console.error('Error retrieving fallback GitHub token:', fallbackError);
      
      // Check for environment variable (for development/testing only)
      const envToken = process.env.GITHUB_TOKEN;
      if (envToken) {
        if (DEBUG) console.log('Using GITHUB_TOKEN environment variable');
        return envToken;
      }
      
      throw new Error('Failed to retrieve valid GitHub token from all sources');
    }
  }
};

// Create Octokit instance with proper error handling
const createOctokit = async (scmAuthApi: typeof scmAuthApiRef.T): Promise<Octokit> => {
  try {
    const { token } = await scmAuthApi.getCredentials({
      url: 'https://github.com',
    });

    if (!token) {
      throw new Error('No GitHub token available');
    }

    return new Octokit({
      auth: token,
      log: {
        debug: () => {},
        info: () => {},
        warn: console.warn,
        error: console.error,
      },
    });
  } catch (error) {
    console.error('Failed to create Octokit instance:', error);
    throw new Error('Failed to authenticate with GitHub');
  }
};

export const terraformEnvironmentsPlugin = createPlugin({
  id: 'invincible.terraform-environments',
  routes: {
    root: rootRouteRef,
  },
});

export const TerraformEnvironmentsPage = terraformEnvironmentsPlugin.provide(
  createRoutableExtension({
    name: 'TerraformEnvironmentsPage',
    component: () => import('./components/TerraformEnvironmentsPage').then(m => m.TerraformEnvironmentsPage),
    mountPoint: rootRouteRef,
  }),
); 