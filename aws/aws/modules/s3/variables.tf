variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "bucket_name" {
  description = "Name of the S3 bucket"
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