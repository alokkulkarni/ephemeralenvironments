import { createApiFactory, createApiRef } from '@backstage/core-plugin-api';
import { scmAuthApiRef } from '@backstage/integration-react';
import { Octokit } from '@octokit/rest';
import { EnvironmentApi, Environment, EnvironmentListParams, EnvironmentGetParams } from './types';

const parseEnvironmentStatus = (status: string): Environment['status'] => {
  switch (status.toLowerCase()) {
    case 'creating':
    case 'active':
    case 'failed':
    case 'destroying':
    case 'destroyed':
    case 'open':
    case 'closed':
      return status.toLowerCase() as Environment['status'];
    default:
      return 'unknown';
  }
};

const parseEnvironmentType = (type: string): Environment['environment'] => {
  switch (type.toLowerCase()) {
    case 'dev':
    case 'staging':
    case 'prod':
      return type.toLowerCase() as Environment['environment'];
    default:
      return 'unknown';
  }
};

interface EnvironmentApiConfig {
  defaultOwner: string;
  defaultRepo: string;
  scmAuthApi: typeof scmAuthApiRef.T;
}

const createOctokit = async (scmAuthApi: typeof scmAuthApiRef.T) => {
  try {
    const { token } = await scmAuthApi.getCredentials({ url: 'https://github.com' });
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
    console.error('Error creating Octokit instance:', error);
    throw new Error(`GitHub authentication failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const createEnvironmentApi = ({ defaultOwner, defaultRepo, scmAuthApi }: EnvironmentApiConfig): EnvironmentApi => {
  // Create a GitHub API instance
  const githubApi = {
    listIssues: async ({ owner = defaultOwner, repo = defaultRepo, labels }: { owner?: string; repo?: string; labels?: string[] }) => {
      const octokit = await createOctokit(scmAuthApi);
      const labelsParam = labels ? labels.join(',') : undefined;
      const response = await octokit.issues.listForRepo({
        owner,
        repo,
        state: 'all',
        labels: labelsParam,
      });
      
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
    },

    getIssue: async ({ owner = defaultOwner, repo = defaultRepo, number }: { owner?: string; repo?: string; number: number }) => {
      const octokit = await createOctokit(scmAuthApi);
      const response = await octokit.issues.get({
        owner,
        repo,
        issue_number: number,
      });
      
      const issue = response.data;
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
    },

    createComment: async ({ owner = defaultOwner, repo = defaultRepo, number, body }: { owner?: string; repo?: string; number: number; body: string }) => {
      const octokit = await createOctokit(scmAuthApi);
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: number,
        body,
      });
    },

    updateIssue: async ({ owner = defaultOwner, repo = defaultRepo, number, state }: { owner?: string; repo?: string; number: number; state: string }) => {
      const octokit = await createOctokit(scmAuthApi);
      const validState = state === 'open' || state === 'closed' ? state : 'closed';
      await octokit.issues.update({
        owner,
        repo,
        issue_number: number,
        state: validState,
      });
    },
  };

  return {
    listEnvironments: async ({ owner = defaultOwner, repo = defaultRepo }: EnvironmentListParams) => {
      // Validate required parameters
      if (!owner || !repo) {
        throw new Error('GitHub owner and repo must be provided');
      }
      
      const issues = await githubApi.listIssues({ 
        owner, 
        repo, 
        labels: ['terraform-environment'] 
      });

      return issues.map(issue => ({
        id: issue.number.toString(),
        name: issue.title,
        project: 'default',
        organization: 'default',
        squad: 'default',
        environment: parseEnvironmentType(issue.labels.find(l => ['dev', 'staging', 'prod'].includes(l.name))?.name || 'unknown'),
        status: parseEnvironmentStatus(issue.state),
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        labels: issue.labels.map(l => l.name),
        lifetimeDays: 7, // Default value
        autoDestroy: true // Default value
      }));
    },

    getEnvironment: async ({ owner = defaultOwner, repo = defaultRepo, id }: EnvironmentGetParams) => {
      // Validate required parameters
      if (!owner || !repo) {
        throw new Error('GitHub owner and repo must be provided');
      }
      if (!id) {
        throw new Error('Environment ID must be provided');
      }
      
      const issue = await githubApi.getIssue({ owner, repo, number: parseInt(id, 10) });
      
      try {
        const metadata = JSON.parse(issue.body);
        return {
          id: issue.number.toString(),
          name: issue.title,
          project: 'default',
          organization: 'default',
          squad: 'default',
          environment: parseEnvironmentType(issue.labels.find(l => ['dev', 'staging', 'prod'].includes(l.name))?.name || 'unknown'),
          status: parseEnvironmentStatus(issue.state),
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
          labels: issue.labels.map(l => l.name),
          lifetimeDays: metadata.environment?.lifetimeDays || 7,
          autoDestroy: metadata.environment?.autoDestroy ?? true
        };
      } catch (error) {
        throw new Error('Failed to parse environment metadata');
      }
    },

    destroyEnvironment: async ({ owner = defaultOwner, repo = defaultRepo, id }: EnvironmentGetParams) => {
      // Validate required parameters
      if (!owner || !repo) {
        throw new Error('GitHub owner and repo must be provided');
      }
      if (!id) {
        throw new Error('Environment ID must be provided');
      }
      
      // First verify the environment exists
      await createEnvironmentApi({ defaultOwner, defaultRepo, scmAuthApi }).getEnvironment({ 
        owner, 
        repo, 
        id,
        projectName: 'default',
        orgName: 'default',
        squadName: 'default'
      });

      // Update the issue state to closed
      await githubApi.updateIssue({ 
        owner, 
        repo, 
        number: parseInt(id, 10), 
        state: 'closed' 
      });

      // Add a comment about the destruction
      await githubApi.createComment({
        owner,
        repo,
        number: parseInt(id, 10),
        body: `Environment marked for destruction`
      });
    },

    getEnvironmentStatus: async ({ owner = defaultOwner, repo = defaultRepo, id }) => {
      // Validate required parameters
      if (!owner || !repo) {
        throw new Error('GitHub owner and repo must be provided');
      }
      if (!id) {
        throw new Error('Environment ID must be provided');
      }
      
      const issue = await githubApi.getIssue({ owner, repo, number: parseInt(id, 10) });
      return {
        status: parseEnvironmentStatus(issue.state),
        updatedAt: issue.updated_at
      };
    },

    updateEnvironmentStatus: async ({ owner = defaultOwner, repo = defaultRepo, id, status }) => {
      // Validate required parameters
      if (!owner || !repo) {
        throw new Error('GitHub owner and repo must be provided');
      }
      if (!id) {
        throw new Error('Environment ID must be provided');
      }
      if (!status) {
        throw new Error('Status must be provided');
      }
      
      await githubApi.updateIssue({ 
        owner, 
        repo, 
        number: parseInt(id, 10), 
        state: status 
      });
    }
  };
};

export const environmentApiRef = createApiRef<EnvironmentApi>({
  id: 'plugin.terraform-environments.api',
});

export const environmentApi = createApiFactory({
  api: environmentApiRef,
  deps: { scmAuthApi: scmAuthApiRef },
  factory: ({ scmAuthApi }) => createEnvironmentApi({ defaultOwner: 'backstage', defaultRepo: 'terraform-environments', scmAuthApi }),
}); 