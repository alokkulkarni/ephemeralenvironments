export interface Environment {
  id: string;
  name?: string;
  project: string;
  organization: string;
  squad: string;
  environment: 'dev' | 'staging' | 'prod' | 'unknown';
  status: 'creating' | 'active' | 'failed' | 'destroying' | 'destroyed' | 'open' | 'closed' | 'unknown';
  createdAt: string;
  updatedAt: string;
  labels: string[];
  lifetimeDays?: number;
  autoDestroy?: boolean;
}

export interface EnvironmentMetadata {
  name?: string;
  project: string;
  organization: string;
  squad: string;
  type: 'dev' | 'staging' | 'prod';
  created_at: string;
  pr_number?: number;
  status: 'creating' | 'active' | 'failed' | 'destroying' | 'destroyed';
  lifetimeDays?: number;
  autoDestroy?: boolean;
}

export interface EnvironmentListParams {
  owner: string;
  repo: string;
  projectName: string;
  orgName: string;
  squadName: string;
}

export interface EnvironmentGetParams extends EnvironmentListParams {
  id: string;
}

export interface EnvironmentApi {
  listEnvironments: (params: EnvironmentListParams) => Promise<Environment[]>;
  getEnvironment: (params: EnvironmentGetParams) => Promise<Environment>;
  destroyEnvironment: (params: EnvironmentGetParams) => Promise<void>;
  getEnvironmentStatus(config: { owner: string; repo: string; id: string }): Promise<{ status: string; updatedAt: string }>;
  updateEnvironmentStatus(config: { owner: string; repo: string; id: string; status: string }): Promise<void>;
} 