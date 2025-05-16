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

variable "vpc_id" {
  description = "ID of the VPC where resources will be created"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the ALB"
  type        = list(string)
}

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "certificate_arn" {
  description = "ARN of the SSL certificate to use for HTTPS"
  type        = string
  default     = null
} 