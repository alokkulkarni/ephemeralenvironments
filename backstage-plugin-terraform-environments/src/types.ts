export type EnvironmentStatus = 'creating' | 'active' | 'failed' | 'destroying' | 'destroyed' | 'open' | 'closed' | 'unknown';
export type EnvironmentType = 'dev' | 'staging' | 'prod' | 'unknown';

export interface Environment {
  id: string;
  name: string;
  project: string;
  organization: string;
  squad: string;
  environment: EnvironmentType;
  status: EnvironmentStatus;
  createdAt: string;
  updatedAt: string;
  labels: string[];
  lifetimeDays: number;
  autoDestroy: boolean;
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
  owner?: string;
  repo?: string;
}

export interface EnvironmentGetParams {
  owner?: string;
  repo?: string;
  id: string;
}

export interface EnvironmentStatusParams {
  owner?: string;
  repo?: string;
  id: string;
}

export interface EnvironmentStatusUpdateParams {
  owner?: string;
  repo?: string;
  id: string;
  status: EnvironmentStatus;
}

export interface EnvironmentApi {
  listEnvironments(params: EnvironmentListParams): Promise<Environment[]>;
  getEnvironment(params: EnvironmentGetParams): Promise<Environment>;
  destroyEnvironment(params: EnvironmentGetParams): Promise<void>;
  getEnvironmentStatus(params: EnvironmentStatusParams): Promise<{ status: EnvironmentStatus; updatedAt: string }>;
  updateEnvironmentStatus(params: EnvironmentStatusUpdateParams): Promise<void>;
} 