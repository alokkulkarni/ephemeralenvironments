import { Config } from '@backstage/config';

declare module '@backstage/config' {
  interface Config {
    terraformenvironments?: {
      defaultowner: string;
      defaultrepo: string;
    };
  }
}

// Define the configuration schema
export const configSchema = {
  terraformenvironments: {
    defaultowner: {
      type: 'string',
      visibility: 'frontend',
      description: 'The default GitHub organization/owner for terraform environments',
    },
    defaultrepo: {
      type: 'string',
      visibility: 'frontend',
      description: 'The default GitHub repository for terraform environments',
    },
  },
}; 