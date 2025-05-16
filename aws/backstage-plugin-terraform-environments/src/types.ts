export interface Environment {
  id: string;
  name: string;
  project: string;
  organization: string;
  squad: string;
  environment: 'dev' | 'staging' | 'prod';
  status: string;
  createdAt: string;
  updatedAt: string;
  labels: string[];
  lifetimeDays: number;
  autoDestroy: boolean;
}

export interface EnvironmentApi {
  listEnvironments(config: { owner: string; repo: string }): Promise<Environment[]>;
  getEnvironment(config: { owner: string; repo: string; id: string }): Promise<Environment>;
  destroyEnvironment(config: { owner: string; repo: string; id: string }): Promise<void>;
  getEnvironmentStatus(config: { owner: string; repo: string; id: string }): Promise<{ status: string; updatedAt: string }>;
  updateEnvironmentStatus(config: { owner: string; repo: string; id: string; status: string }): Promise<void>;
} 