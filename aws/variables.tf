variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "eu-west-2"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones to use"
  type        = list(string)
  default     = ["eu-west-2a", "eu-west-2b"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24"]
}

# EKS Variables
variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
  default     = "dev-eks-cluster"
}

variable "cluster_version" {
  description = "Kubernetes version to use for the EKS cluster"
  type        = string
  default     = "1.27"
}

variable "eks_cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.28"
}

variable "eks_node_groups" {
  description = "Map of EKS node groups"
  type = map(object({
    desired_size = number
    min_size     = number
    max_size     = number
    instance_types = list(string)
  }))
  default = {
    general = {
      desired_size   = 2
      min_size       = 1
      max_size       = 3
      instance_types = ["t3.medium"]
    }
  }
}

# Optional Infrastructure Variables
variable "enable_rds" {
  description = "Enable RDS PostgreSQL instance"
  type        = bool
  default     = false
}

variable "rds_db_name" {
  description = "Name of the RDS database"
  type        = string
  default     = "devdb"
}

variable "rds_username" {
  description = "Username for RDS database"
  type        = string
  default     = "dbadmin"
}

variable "rds_password" {
  description = "Password for RDS database"
  type        = string
  sensitive   = true
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "enable_dynamodb" {
  description = "Enable DynamoDB table"
  type        = bool
  default     = false
}

variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  type        = string
  default     = "dev-table"
}

variable "enable_s3" {
  description = "Enable S3 bucket"
  type        = bool
  default     = false
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket"
  type        = string
  default     = "dev-bucket"
}

variable "enable_elasticache" {
  description = "Enable ElastiCache Redis cluster"
  type        = bool
  default     = false
}

variable "elasticache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "elasticache_num_nodes" {
  description = "Number of ElastiCache nodes"
  type        = number
  default     = 1
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