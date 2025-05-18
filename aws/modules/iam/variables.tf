variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "org_name" {
  description = "Name of the organization"
  type        = string
}

variable "squad_name" {
  description = "Name of the squad/team"
  type        = string
}

variable "aws_region" {
  description = "AWS region where resources are deployed"
  type        = string
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
}

variable "eks_oidc_provider_arn" {
  description = "ARN of the EKS OIDC provider"
  type        = string
  default     = null
}

variable "enable_rds" {
  description = "Enable RDS access policies"
  type        = bool
  default     = false
}

variable "enable_dynamodb" {
  description = "Enable DynamoDB access policies"
  type        = bool
  default     = false
}

variable "enable_s3" {
  description = "Enable S3 access policies"
  type        = bool
  default     = false
}

variable "enable_elasticache" {
  description = "Enable ElastiCache access policies"
  type        = bool
  default     = false
} 