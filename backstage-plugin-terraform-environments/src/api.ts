import { createApiFactory, createApiRef } from '@backstage/core-plugin-api';
import { githubApiRef } from './plugin';
import { EnvironmentApi } from './types';

export const environmentApiRef = createApiRef<EnvironmentApi>({
  id: 'plugin.terraform-environments.api',
});

export const environmentApi = createApiFactory({
  api: environmentApiRef,
  deps: { githubApi: githubApiRef },
  factory: ({ githubApi }) => ({
    listEnvironments: async ({ owner, repo }) => {
      const issues = await githubApi.listIssues({
        owner,
        repo,
        labels: ['terraform-environment'],
      });

      return issues.map(issue => {
        const metadata = JSON.parse(issue.body);
        return {
          id: issue.number.toString(),
          name: metadata.name,
          project: metadata.project,
          organization: metadata.organization,
          squad: metadata.squad,
          environment: metadata.environment,
          status: issue.state,
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
          labels: issue.labels.map(l => l.name),
          lifetimeDays: metadata.lifetimeDays,
          autoDestroy: metadata.autoDestroy,
        };
      });
    },

    getEnvironment: async ({ owner, repo, id }) => {
      const issues = await githubApi.listIssues({
        owner,
        repo,
        labels: ['terraform-environment'],
      });

      const issue = issues.find(i => i.number.toString() === id);
      if (!issue) {
        throw new Error(`Environment ${id} not found`);
      }

      const metadata = JSON.parse(issue.body);
      return {
        id: issue.number.toString(),
        name: metadata.name,
        project: metadata.project,
        organization: metadata.organization,
        squad: metadata.squad,
        environment: metadata.environment,
        status: issue.state,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        labels: issue.labels.map(l => l.name),
        lifetimeDays: metadata.lifetimeDays,
        autoDestroy: metadata.autoDestroy,
      };
    },

    destroyEnvironment: async ({ owner, repo, id }) => {
      await githubApi.createComment({
        owner,
        repo,
        number: parseInt(id, 10),
        body: 'Environment destruction requested. Starting cleanup process...',
      });

      await githubApi.createWorkflowDispatch({
        owner,
        repo,
        workflow_id: 'destroy-environment.yml',
        ref: 'main',
        inputs: {
          issue_number: id,
        },
      });
    },

    getEnvironmentStatus: async ({ owner, repo, id }) => {
      const issue = await githubApi.getIssue({
        owner,
        repo,
        number: parseInt(id, 10),
      });

      return {
        status: issue.state,
        updatedAt: issue.updated_at,
      };
    },

    updateEnvironmentStatus: async ({ owner, repo, id, status }) => {
      await githubApi.updateIssue({
        owner,
        repo,
        number: parseInt(id, 10),
        state: status,
      });

      await githubApi.createComment({
        owner,
        repo,
        number: parseInt(id, 10),
        body: `Environment status updated to ${status}`,
      });
    },
  }),
}); 