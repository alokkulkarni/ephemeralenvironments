terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

locals {
  # Get current timestamp in ISO 8601 format
  timestamp = formatdate("YYYY-MM-DD'T'HH:mm:ssZ", timestamp())
  
  common_tags = {
    Environment  = var.environment
    Project      = var.project_name
    Organization = var.org_name
    Squad        = var.squad_name
    ManagedBy    = "terraform"
    CreatedAt    = local.timestamp
  }
}

# EKS Cluster Role
resource "aws_iam_role" "eks_cluster" {
  name = "${var.environment}-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

# EKS Node Group Role
resource "aws_iam_role" "eks_node_group" {
  name = "${var.environment}-eks-node-group-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node_group.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node_group.name
}

resource "aws_iam_role_policy_attachment" "eks_container_registry_readonly" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node_group.name
}

# Application Role for EKS Pods
resource "aws_iam_role" "eks_pod_role" {
  name = "${var.environment}-eks-pod-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = var.eks_oidc_provider_arn
        }
        Condition = {
          StringEquals = {
            "${replace(var.eks_oidc_provider_arn, "/^[^/]+/", "")}:sub" = "system:serviceaccount:default:app-service-account"
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

# Base policy for EKS pods
resource "aws_iam_policy" "eks_pod_base_policy" {
  name = "${var.environment}-eks-pod-base-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "eks_pod_base_policy" {
  policy_arn = aws_iam_policy.eks_pod_base_policy.arn
  role       = aws_iam_role.eks_pod_role.name
}

# Optional Infrastructure Policies
# RDS Policy
resource "aws_iam_policy" "rds_access" {
  count = var.enable_rds ? 1 : 0
  name  = "${var.environment}-rds-access-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds-db:connect",
          "rds:DescribeDBInstances",
          "rds:DescribeDBClusters"
        ]
        Resource = [
          "arn:aws:rds:${var.aws_region}:${var.aws_account_id}:db:${var.environment}-rds",
          "arn:aws:rds-db:${var.aws_region}:${var.aws_account_id}:dbuser:${var.environment}-rds/*"
        ]
      }
    ]
  })

  tags = local.common_tags
}

# DynamoDB Policy
resource "aws_iam_policy" "dynamodb_access" {
  count = var.enable_dynamodb ? 1 : 0
  name  = "${var.environment}-dynamodb-access-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:DeleteItem",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:UpdateItem"
        ]
        Resource = [
          "arn:aws:dynamodb:${var.aws_region}:${var.aws_account_id}:table/${var.environment}-table",
          "arn:aws:dynamodb:${var.aws_region}:${var.aws_account_id}:table/${var.environment}-table/index/*"
        ]
      }
    ]
  })

  tags = local.common_tags
}

# S3 Policy
resource "aws_iam_policy" "s3_access" {
  count = var.enable_s3 ? 1 : 0
  name  = "${var.environment}-s3-access-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.environment}-bucket",
          "arn:aws:s3:::${var.environment}-bucket/*"
        ]
      }
    ]
  })

  tags = local.common_tags
}

# ElastiCache Policy
resource "aws_iam_policy" "elasticache_access" {
  count = var.enable_elasticache ? 1 : 0
  name  = "${var.environment}-elasticache-access-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "elasticache:DescribeReplicationGroups",
          "elasticache:DescribeCacheClusters",
          "elasticache:ListTagsForResource"
        ]
        Resource = [
          "arn:aws:elasticache:${var.aws_region}:${var.aws_account_id}:replicationgroup:${var.environment}-redis"
        ]
      }
    ]
  })

  tags = local.common_tags
}

# Attach optional policies to EKS pod role if enabled
resource "aws_iam_role_policy_attachment" "rds_access" {
  count      = var.enable_rds ? 1 : 0
  policy_arn = aws_iam_policy.rds_access[0].arn
  role       = aws_iam_role.eks_pod_role.name
}

resource "aws_iam_role_policy_attachment" "dynamodb_access" {
  count      = var.enable_dynamodb ? 1 : 0
  policy_arn = aws_iam_policy.dynamodb_access[0].arn
  role       = aws_iam_role.eks_pod_role.name
}

resource "aws_iam_role_policy_attachment" "s3_access" {
  count      = var.enable_s3 ? 1 : 0
  policy_arn = aws_iam_policy.s3_access[0].arn
  role       = aws_iam_role.eks_pod_role.name
}

resource "aws_iam_role_policy_attachment" "elasticache_access" {
  count      = var.enable_elasticache ? 1 : 0
  policy_arn = aws_iam_policy.elasticache_access[0].arn
  role       = aws_iam_role.eks_pod_role.name
}

# AWS Load Balancer Controller Policy
resource "aws_iam_policy" "aws_load_balancer_controller" {
  name = "${var.environment}-aws-load-balancer-controller-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "iam:CreateServiceLinkedRole",
          "ec2:DescribeAccountAttributes",
          "ec2:DescribeAddresses",
          "ec2:DescribeAvailabilityZones",
          "ec2:DescribeInternetGateways",
          "ec2:DescribeVpcs",
          "ec2:DescribeSubnets",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeInstances",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DescribeTags",
          "ec2:GetCoipPoolUsage",
          "ec2:DescribeCoipPools",
          "elasticloadbalancing:DescribeLoadBalancers",
          "elasticloadbalancing:DescribeLoadBalancerAttributes",
          "elasticloadbalancing:DescribeListeners",
          "elasticloadbalancing:DescribeListenerCertificates",
          "elasticloadbalancing:DescribeSSLPolicies",
          "elasticloadbalancing:DescribeRules",
          "elasticloadbalancing:DescribeTargetGroups",
          "elasticloadbalancing:DescribeTargetGroupAttributes",
          "elasticloadbalancing:DescribeTargetHealth",
          "elasticloadbalancing:DescribeTags",
          "elasticloadbalancing:CreateLoadBalancer",
          "elasticloadbalancing:CreateTargetGroup",
          "elasticloadbalancing:CreateListener",
          "elasticloadbalancing:DeleteLoadBalancer",
          "elasticloadbalancing:DeleteTargetGroup",
          "elasticloadbalancing:DeleteListener",
          "elasticloadbalancing:ModifyLoadBalancerAttributes",
          "elasticloadbalancing:ModifyTargetGroup",
          "elasticloadbalancing:ModifyTargetGroupAttributes",
          "elasticloadbalancing:SetIpAddressType",
          "elasticloadbalancing:SetSecurityGroups",
          "elasticloadbalancing:SetSubnets",
          "elasticloadbalancing:AddTags",
          "elasticloadbalancing:RemoveTags",
          "elasticloadbalancing:ModifyListener",
          "elasticloadbalancing:AddListenerCertificates",
          "elasticloadbalancing:RemoveListenerCertificates",
          "elasticloadbalancing:SetRulePriorities"
        ]
        Resource = "*"
      }
    ]
  })

  tags = local.common_tags
}

# AWS Load Balancer Controller Role
resource "aws_iam_role" "aws_load_balancer_controller" {
  name = "${var.environment}-aws-load-balancer-controller-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = var.eks_oidc_provider_arn
        }
        Condition = {
          StringEquals = {
            "${replace(var.eks_oidc_provider_arn, "/^[^/]+/", "")}:sub" = "system:serviceaccount:kube-system:aws-load-balancer-controller"
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "aws_load_balancer_controller" {
  policy_arn = aws_iam_policy.aws_load_balancer_controller.arn
  role       = aws_iam_role.aws_load_balancer_controller.name
} 