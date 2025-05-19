variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "cluster_version" {
  description = "Kubernetes version to use for the EKS cluster"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC where the EKS cluster will be created"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the EKS cluster"
  type        = list(string)
}

variable "node_groups" {
  description = "Map of EKS node groups"
  type = map(object({
    desired_size = number
    min_size     = number
    max_size     = number
    instance_types = list(string)
  }))
}

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

variable "cluster_role_arn" {
  description = "ARN of the IAM role for the EKS cluster"
  type        = string
}

variable "node_role_arn" {
  description = "ARN of the IAM role for the EKS node groups"
  type        = string
}

variable "aws_load_balancer_controller_role_arn" {
  description = "ARN of the IAM role for AWS Load Balancer Controller"
  type        = string
  default     = null
}

variable "aws_load_balancer_controller_role_name" {
  description = "Name of the IAM role for AWS Load Balancer Controller"
  type        = string
  default     = null
}

variable "pod_role_name" {
  description = "Name of the IAM role for EKS pods"
  type        = string
  default     = null
}

variable "aws_region" {
  description = "AWS region where resources are deployed"
  type        = string
} 