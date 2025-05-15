terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  environment     = var.environment
  vpc_cidr       = var.vpc_cidr
  azs            = var.availability_zones
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs
  project_name   = var.project_name
  org_name       = var.org_name
  squad_name     = var.squad_name
}

# IAM Module
module "iam" {
  source = "./modules/iam"

  environment     = var.environment
  project_name   = var.project_name
  org_name       = var.org_name
  squad_name     = var.squad_name
  aws_region     = var.aws_region
  aws_account_id = data.aws_caller_identity.current.account_id
  eks_oidc_provider_arn = module.eks.oidc_provider_arn

  enable_rds        = var.enable_rds
  enable_dynamodb   = var.enable_dynamodb
  enable_s3         = var.enable_s3
  enable_elasticache = var.enable_elasticache
}

# Get current AWS account ID
data "aws_caller_identity" "current" {}

# EKS Module (Mandatory)
module "eks" {
  source = "./modules/eks"

  environment    = var.environment
  project_name   = var.project_name
  org_name       = var.org_name
  squad_name     = var.squad_name

  cluster_name    = "${var.environment}-eks-cluster"
  cluster_version = var.eks_cluster_version
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids

  cluster_role_arn = module.iam.eks_cluster_role_arn
  node_role_arn    = module.iam.eks_node_group_role_arn

  aws_load_balancer_controller_role_arn = module.iam.aws_load_balancer_controller_role_arn
  aws_region                            = var.aws_region

  node_groups = var.eks_node_groups
  depends_on  = [module.vpc, module.iam]
}

# Optional Infrastructure Modules
module "rds" {
  count  = var.enable_rds ? 1 : 0
  source = "./modules/rds"

  environment     = var.environment
  project_name   = var.project_name
  org_name       = var.org_name
  squad_name     = var.squad_name
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnet_ids
  db_name        = var.rds_db_name
  db_username    = var.rds_username
  db_password    = var.rds_password
  instance_class = var.rds_instance_class
  allowed_security_groups = [module.eks.cluster_security_group_id]
  depends_on     = [module.iam]
}

module "dynamodb" {
  count  = var.enable_dynamodb ? 1 : 0
  source = "./modules/dynamodb"

  environment   = var.environment
  project_name = var.project_name
  org_name     = var.org_name
  squad_name   = var.squad_name
  table_name   = var.dynamodb_table_name
  depends_on   = [module.iam]
}

module "s3" {
  count  = var.enable_s3 ? 1 : 0
  source = "./modules/s3"

  environment   = var.environment
  project_name = var.project_name
  org_name     = var.org_name
  squad_name   = var.squad_name
  bucket_name  = var.s3_bucket_name
  depends_on   = [module.iam]
}

module "elasticache" {
  count  = var.enable_elasticache ? 1 : 0
  source = "./modules/elasticache"

  environment     = var.environment
  project_name   = var.project_name
  org_name       = var.org_name
  squad_name     = var.squad_name
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnet_ids
  node_type      = var.elasticache_node_type
  num_cache_nodes = var.elasticache_num_nodes
  allowed_security_groups = [module.eks.cluster_security_group_id]
  depends_on     = [module.iam]
}

# Load Balancer Module
module "alb" {
  source = "./modules/alb"

  environment     = var.environment
  project_name   = var.project_name
  org_name       = var.org_name
  squad_name     = var.squad_name
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.public_subnet_ids
  cluster_name   = var.cluster_name
  depends_on     = [module.eks]
} 