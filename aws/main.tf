terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.27"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Configure Kubernetes provider for EKS
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args = [
      "eks",
      "get-token",
      "--cluster-name",
      module.eks.cluster_name,
      "--region",
      var.aws_region
    ]
  }
}

# Configure Helm provider for EKS
provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args = [
        "eks",
        "get-token",
        "--cluster-name",
        module.eks.cluster_name,
        "--region",
        var.aws_region
      ]
    }
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  environment     = var.environment
  vpc_cidr        = var.vpc_cidr
  azs             = var.availability_zones
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs
  project_name    = var.project_name
  org_name        = var.org_name
  squad_name      = var.squad_name
}

# IAM Module
module "iam" {
  source = "./modules/iam"

  environment    = var.environment
  project_name   = var.project_name
  org_name       = var.org_name
  squad_name     = var.squad_name
  aws_region     = var.aws_region
  aws_account_id = data.aws_caller_identity.current.account_id

  enable_rds         = var.enable_rds
  enable_dynamodb    = var.enable_dynamodb
  enable_s3          = var.enable_s3
  enable_elasticache = var.enable_elasticache
}

# Get current AWS account ID
data "aws_caller_identity" "current" {}

# EKS Module (Mandatory)
module "eks" {
  source = "./modules/eks"

  environment  = var.environment
  project_name = var.project_name
  org_name     = var.org_name
  squad_name   = var.squad_name

  cluster_name    = "${var.environment}-eks-cluster"
  cluster_version = var.eks_cluster_version
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids

  cluster_role_arn = module.iam.eks_cluster_role_arn
  node_role_arn    = module.iam.eks_node_group_role_arn

  aws_load_balancer_controller_role_arn = module.iam.aws_load_balancer_controller_role_arn
  aws_region                            = var.aws_region

  node_groups = var.eks_node_groups

  providers = {
    kubernetes = kubernetes
    helm       = helm
  }
}

# Update IAM roles with OIDC provider ARN after EKS cluster is created
resource "aws_iam_role_policy" "update_oidc_provider" {
  for_each = {
    for k, v in {
      pod_role = module.iam.eks_pod_role_name
      alb_role = module.iam.aws_load_balancer_controller_role_name
    } : k => v if v != null
  }

  name = "update-oidc-provider"
  role = each.value

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "sts:AssumeRoleWithWebIdentity"
        Principal = {
          Federated = module.eks.oidc_provider_arn
        }
        Condition = {
          StringEquals = {
            "${replace(module.eks.oidc_provider_arn, "/^[^/]+/", "")}:sub" = (
              each.key == "pod_role"
              ? "system:serviceaccount:default:app-service-account"
              : "system:serviceaccount:kube-system:aws-load-balancer-controller"
            )
          }
        }
      }
    ]
  })

  depends_on = [module.eks]
}

# Optional Infrastructure Modules
module "rds" {
  count  = var.enable_rds ? 1 : 0
  source = "./modules/rds"

  environment             = var.environment
  project_name            = var.project_name
  org_name                = var.org_name
  squad_name              = var.squad_name
  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.private_subnet_ids
  db_name                 = var.rds_db_name
  db_username             = var.rds_username
  db_password             = var.rds_password
  instance_class          = var.rds_instance_class
  allowed_security_groups = [module.eks.cluster_security_group_id]
  depends_on              = [module.iam]
}

module "dynamodb" {
  count  = var.enable_dynamodb ? 1 : 0
  source = "./modules/dynamodb"

  environment  = var.environment
  project_name = var.project_name
  org_name     = var.org_name
  squad_name   = var.squad_name
  table_name   = var.dynamodb_table_name
  depends_on   = [module.iam]
}

module "s3" {
  count  = var.enable_s3 ? 1 : 0
  source = "./modules/s3"

  environment  = var.environment
  project_name = var.project_name
  org_name     = var.org_name
  squad_name   = var.squad_name
  bucket_name  = var.s3_bucket_name
  depends_on   = [module.iam]
}

module "elasticache" {
  count  = var.enable_elasticache ? 1 : 0
  source = "./modules/elasticache"

  environment             = var.environment
  project_name            = var.project_name
  org_name                = var.org_name
  squad_name              = var.squad_name
  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.private_subnet_ids
  node_type               = var.elasticache_node_type
  num_cache_nodes         = var.elasticache_num_nodes
  allowed_security_groups = [module.eks.cluster_security_group_id]
  depends_on              = [module.iam]
}

# Load Balancer Module
module "alb" {
  source = "./modules/alb"

  environment  = var.environment
  project_name = var.project_name
  org_name     = var.org_name
  squad_name   = var.squad_name
  vpc_id       = module.vpc.vpc_id
  subnet_ids   = module.vpc.public_subnet_ids
  cluster_name = var.cluster_name
  depends_on   = [module.eks]
} 