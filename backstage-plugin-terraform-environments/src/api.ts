import { createApiFactory, createApiRef } from '@backstage/core-plugin-api';
import { githubApiRef } from './plugin';
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

export const createEnvironmentApi = (githubApi: typeof githubApiRef.T): EnvironmentApi => {
  return {
    listEnvironments: async ({ owner, repo, projectName, orgName, squadName }: EnvironmentListParams) => {
      // Validate required parameters
      if (!owner || !repo) {
        throw new Error('GitHub owner and repo must be provided');
      }
      if (!projectName || !orgName || !squadName) {
        throw new Error('Project, organization, and squad must be provided');
      }
      
      const issues = await githubApi.listIssues({ 
        owner, 
        repo, 
        labels: ['terraform-environment'] 
      });

      return issues
        .filter(issue => {
          try {
            const metadata = JSON.parse(issue.body);
            return metadata.environment?.project === projectName &&
                   metadata.environment?.organization === orgName &&
                   metadata.environment?.squad === squadName;
          } catch {
            return false;
          }
        })
        .map(issue => ({
          id: issue.number.toString(),
          name: issue.title,
          project: projectName,
          organization: orgName,
          squad: squadName,
          environment: parseEnvironmentType(issue.labels.find(l => ['dev', 'staging', 'prod'].includes(l.name))?.name || 'unknown'),
          status: parseEnvironmentStatus(issue.state),
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
          labels: issue.labels.map(l => l.name),
          lifetimeDays: 7, // Default value
          autoDestroy: true // Default value
        }));
    },

    getEnvironment: async ({ owner, repo, id, projectName, orgName, squadName }: EnvironmentGetParams) => {
      // Validate required parameters
      if (!owner || !repo) {
        throw new Error('GitHub owner and repo must be provided');
      }
      if (!projectName || !orgName || !squadName) {
        throw new Error('Project, organization, and squad must be provided');
      }
      if (!id) {
        throw new Error('Environment ID must be provided');
      }
      
      const issue = await githubApi.getIssue({ owner, repo, number: parseInt(id, 10) });
      
      try {
        const metadata = JSON.parse(issue.body);
        if (metadata.environment?.project !== projectName ||
            metadata.environment?.organization !== orgName ||
            metadata.environment?.squad !== squadName) {
          throw new Error('Environment not found');
        }

        return {
          id: issue.number.toString(),
          name: issue.title,
          project: projectName,
          organization: orgName,
          squad: squadName,
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

    destroyEnvironment: async ({ owner, repo, id, projectName, orgName, squadName }: EnvironmentGetParams) => {
      // Validate required parameters
      if (!owner || !repo) {
        throw new Error('GitHub owner and repo must be provided');
      }
      if (!projectName || !orgName || !squadName) {
        throw new Error('Project, organization, and squad must be provided');
      }
      if (!id) {
        throw new Error('Environment ID must be provided');
      }
      
      // First verify the environment exists and belongs to the project
      await createEnvironmentApi(githubApi).getEnvironment({ 
        owner, 
        repo, 
        id, 
        projectName, 
        orgName, 
        squadName 
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
        body: `Environment marked for destruction by ${projectName}/${orgName}/${squadName}`
      });
    },

    getEnvironmentStatus: async ({ owner, repo, id }) => {
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

    updateEnvironmentStatus: async ({ owner, repo, id, status }) => {
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
  deps: { githubApi: githubApiRef },
  factory: ({ githubApi }) => createEnvironmentApi(githubApi),
}); 