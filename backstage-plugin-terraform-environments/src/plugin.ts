import { createApiFactory, createPlugin, createRoutableExtension, createApiRef } from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';
import { scmAuthApiRef } from '@backstage/integration-react';
import { Octokit } from '@octokit/rest';

// Configuration options for the plugin
export interface TerraformEnvironmentsConfig {
  defaultOwner: string;
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
    const token = await getGitHubToken(scmAuthApi);
    
    if (!token) {
      throw new Error('Retrieved null or empty token');
    }
    
    if (DEBUG) console.log('Creating Octokit instance with token');
    return new Octokit({
      auth: token,
      request: {
        // Add debugging for requests
        hook: (request: any, options: any) => {
          if (DEBUG) console.log(`Request: ${options.method} ${options.url}`);
          return request(options);
        },
      },
    });
  } catch (error) {
    if (DEBUG) console.error('Error creating Octokit instance:', error);
    throw new Error(`GitHub authentication failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const terraformEnvironmentsPlugin = createPlugin({
  id: 'terraform-environments',
  apis: [
    createApiFactory({
      api: githubApiRef,
      deps: { scmAuthApi: scmAuthApiRef },
      factory: ({ scmAuthApi }) => {
        return {
          listIssues: async ({ owner, repo, labels }) => {
            try {
              if (DEBUG) console.log(`Listing issues for ${owner}/${repo}`);
              const octokit = await createOctokit(scmAuthApi);
              
              const labelsParam = labels ? labels.join(',') : undefined;
              const response = await octokit.issues.listForRepo({
                owner,
                repo,
                state: 'all',
                labels: labelsParam,
              });
              
              // Transform the Octokit response to our GitHubIssue type
              return response.data.map(issue => ({
                number: issue.number,
                title: issue.title || '',
                body: issue.body || '',
                state: issue.state || '',
                labels: issue.labels ? 
                  issue.labels.map(label => 
                    typeof label === 'string' ? { name: label } : { name: label.name || '' }
                  ) : [],
                created_at: issue.created_at || '',
                updated_at: issue.updated_at || '',
              }));
            } catch (error: any) {
              console.error('Error fetching issues from GitHub:', error);
              throw new Error(`GitHub API error: ${error?.message || 'Unknown error'}`);
            }
          },

          getIssue: async ({ owner, repo, number }) => {
            try {
              if (DEBUG) console.log(`Getting issue #${number} from ${owner}/${repo}`);
              const octokit = await createOctokit(scmAuthApi);
              
              const response = await octokit.issues.get({
                owner,
                repo,
                issue_number: number,
              });
              
              const issue = response.data;
              // Transform to our GitHubIssue type
              return {
                number: issue.number,
                title: issue.title || '',
                body: issue.body || '',
                state: issue.state || '',
                labels: issue.labels ? 
                  issue.labels.map(label => 
                    typeof label === 'string' ? { name: label } : { name: label.name || '' }
                  ) : [],
                created_at: issue.created_at || '',
                updated_at: issue.updated_at || '',
              };
            } catch (error: any) {
              console.error('Error fetching issue from GitHub:', error);
              throw new Error(`GitHub API error: ${error?.message || 'Unknown error'}`);
            }
          },

          createComment: async ({ owner, repo, number, body }) => {
            try {
              if (DEBUG) console.log(`Creating comment on issue #${number} in ${owner}/${repo}`);
              const octokit = await createOctokit(scmAuthApi);
              
              await octokit.issues.createComment({
                owner,
                repo,
                issue_number: number,
                body,
              });
            } catch (error: any) {
              console.error('Error creating comment on GitHub:', error);
              throw new Error(`GitHub API error: ${error?.message || 'Unknown error'}`);
            }
          },

          updateIssue: async ({ owner, repo, number, state }) => {
            try {
              if (DEBUG) console.log(`Updating issue #${number} in ${owner}/${repo} to state ${state}`);
              const octokit = await createOctokit(scmAuthApi);
              
              // Ensure state is valid (open or closed)
              const validState = state === 'open' || state === 'closed' ? state : 'closed';
              
              await octokit.issues.update({
                owner,
                repo,
                issue_number: number,
                state: validState,
              });
            } catch (error: any) {
              console.error('Error updating issue on GitHub:', error);
              throw new Error(`GitHub API error: ${error?.message || 'Unknown error'}`);
            }
          },

          createWorkflowDispatch: async ({ owner, repo, workflow_id, ref, inputs }) => {
            try {
              if (DEBUG) console.log(`Dispatching workflow ${workflow_id} in ${owner}/${repo}`);
              const octokit = await createOctokit(scmAuthApi);
              
              await octokit.actions.createWorkflowDispatch({
                owner,
                repo,
                workflow_id,
                ref,
                inputs,
              });
            } catch (error: any) {
              console.error('Error dispatching workflow on GitHub:', error);
              throw new Error(`GitHub API error: ${error?.message || 'Unknown error'}`);
            }
          },
        };
      },
    }),
  ],
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