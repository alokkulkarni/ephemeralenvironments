terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }
}

locals {
  # Get current timestamp in ISO 8601 format
  timestamp = formatdate("YYYY-MM-DD'T'HH:mm:ssZ", timestamp())
  
  # Create a shorter name prefix for all resources (max 32 chars)
  name_prefix = substr("${var.project_name}-${var.org_name}-${var.squad_name}-${var.environment}", 0, 32)
  
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
  name = "${local.name_prefix}-eks-cluster"

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
  name = "${local.name_prefix}-eks-node"

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

# Application Role for EKS Pods - Only create if eks_oidc_provider_arn is provided
resource "aws_iam_role" "eks_pod_role" {
  count = var.eks_oidc_provider_arn != null ? 1 : 0
  name  = "${local.name_prefix}-eks-pod"

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

# Base policy for EKS pods - Only create if eks_oidc_provider_arn is provided
resource "aws_iam_policy" "eks_pod_base_policy" {
  count = var.eks_oidc_provider_arn != null ? 1 : 0
  name  = "${local.name_prefix}-eks-pod-base"
  description = "Base policy for EKS pods in ${local.name_prefix}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:GetRepositoryPolicy",
          "ecr:DescribeRepositories",
          "ecr:ListImages",
          "ecr:DescribeImages",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage"
        ]
        Resource = "*"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "eks_pod_base_policy" {
  count      = var.eks_oidc_provider_arn != null ? 1 : 0
  policy_arn = aws_iam_policy.eks_pod_base_policy[0].arn
  role       = aws_iam_role.eks_pod_role[0].name
}

# Optional Infrastructure Policies
# RDS Policy
resource "aws_iam_policy" "rds_access" {
  count = var.enable_rds ? 1 : 0
  name  = "${local.name_prefix}-rds-access-policy"
  description = "Policy for RDS access in ${local.name_prefix}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds:DescribeDBInstances",
          "rds:DescribeDBClusters",
          "rds:DescribeDBParameterGroups",
          "rds:DescribeDBParameters",
          "rds:DescribeDBSecurityGroups",
          "rds:DescribeDBSnapshots",
          "rds:DescribeDBSubnetGroups",
          "rds:DescribeEventSubscriptions",
          "rds:DescribeEvents",
          "rds:DescribeOptionGroups",
          "rds:DescribeOrderableDBInstanceOptions",
          "rds:DescribePendingMaintenanceActions",
          "rds:DescribeReservedDBInstances",
          "rds:DescribeReservedDBInstancesOfferings"
        ]
        Resource = "*"
      }
    ]
  })

  tags = local.common_tags
}

# DynamoDB Policy
resource "aws_iam_policy" "dynamodb_access" {
  count = var.enable_dynamodb ? 1 : 0
  name  = "${local.name_prefix}-dynamodb-access-policy"
  description = "Policy for DynamoDB access in ${local.name_prefix}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:CreateTable",
          "dynamodb:DeleteItem",
          "dynamodb:DeleteTable",
          "dynamodb:DescribeTable",
          "dynamodb:GetItem",
          "dynamodb:ListTables",
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:UpdateItem",
          "dynamodb:UpdateTable"
        ]
        Resource = "*"
      }
    ]
  })

  tags = local.common_tags
}

# S3 Policy
resource "aws_iam_policy" "s3_access" {
  count = var.enable_s3 ? 1 : 0
  name  = "${local.name_prefix}-s3-access-policy"
  description = "Policy for S3 access in ${local.name_prefix}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:GetBucketLocation",
          "s3:ListAllMyBuckets",
          "s3:GetBucketAcl",
          "s3:GetBucketPolicy",
          "s3:GetBucketVersioning",
          "s3:GetLifecycleConfiguration",
          "s3:GetBucketTagging",
          "s3:GetBucketWebsite",
          "s3:GetBucketNotification",
          "s3:GetBucketLogging",
          "s3:GetBucketCORS",
          "s3:GetBucketRequestPayment",
          "s3:GetBucketPublicAccessBlock",
          "s3:GetBucketOwnershipControls",
          "s3:GetBucketEncryption",
          "s3:GetBucketIntelligentTieringConfiguration",
          "s3:GetBucketInventoryConfiguration",
          "s3:GetBucketMetricsConfiguration",
          "s3:GetBucketReplication",
          "s3:GetBucketVersioning",
          "s3:GetBucketWebsite",
          "s3:GetObjectAcl",
          "s3:GetObjectLegalHold",
          "s3:GetObjectLockConfiguration",
          "s3:GetObjectRetention",
          "s3:GetObjectTagging",
          "s3:GetObjectTorrent",
          "s3:GetObjectVersion",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionTagging",
          "s3:GetObjectVersionTorrent",
          "s3:GetReplicationConfiguration",
          "s3:ListBucketMultipartUploads",
          "s3:ListBucketVersions",
          "s3:ListMultipartUploadParts",
          "s3:PutBucketAcl",
          "s3:PutBucketCORS",
          "s3:PutBucketLogging",
          "s3:PutBucketNotification",
          "s3:PutBucketOwnershipControls",
          "s3:PutBucketPolicy",
          "s3:PutBucketPublicAccessBlock",
          "s3:PutBucketRequestPayment",
          "s3:PutBucketTagging",
          "s3:PutBucketVersioning",
          "s3:PutBucketWebsite",
          "s3:PutObjectAcl",
          "s3:PutObjectLegalHold",
          "s3:PutObjectLockConfiguration",
          "s3:PutObjectRetention",
          "s3:PutObjectTagging",
          "s3:PutObjectVersionTagging",
          "s3:PutReplicationConfiguration",
          "s3:ReplicateDelete",
          "s3:ReplicateObject",
          "s3:ReplicateTags",
          "s3:RestoreObject"
        ]
        Resource = "*"
      }
    ]
  })

  tags = local.common_tags
}

# ElastiCache Policy
resource "aws_iam_policy" "elasticache_access" {
  count = var.enable_elasticache ? 1 : 0
  name  = "${local.name_prefix}-elasticache-access-policy"
  description = "Policy for ElastiCache access in ${local.name_prefix}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "elasticache:DescribeCacheClusters",
          "elasticache:DescribeCacheParameterGroups",
          "elasticache:DescribeCacheParameters",
          "elasticache:DescribeCacheSecurityGroups",
          "elasticache:DescribeCacheSubnetGroups",
          "elasticache:DescribeEvents",
          "elasticache:DescribeReplicationGroups",
          "elasticache:DescribeReservedCacheNodes",
          "elasticache:DescribeReservedCacheNodesOfferings",
          "elasticache:DescribeSnapshots",
          "elasticache:ListTagsForResource"
        ]
        Resource = "*"
      }
    ]
  })

  tags = local.common_tags
}

# Attach optional policies to EKS pod role if enabled and eks_oidc_provider_arn is provided
resource "aws_iam_role_policy_attachment" "rds_access" {
  count      = var.enable_rds && var.eks_oidc_provider_arn != null ? 1 : 0
  policy_arn = aws_iam_policy.rds_access[0].arn
  role       = aws_iam_role.eks_pod_role[0].name
}

resource "aws_iam_role_policy_attachment" "dynamodb_access" {
  count      = var.enable_dynamodb && var.eks_oidc_provider_arn != null ? 1 : 0
  policy_arn = aws_iam_policy.dynamodb_access[0].arn
  role       = aws_iam_role.eks_pod_role[0].name
}

resource "aws_iam_role_policy_attachment" "s3_access" {
  count      = var.enable_s3 && var.eks_oidc_provider_arn != null ? 1 : 0
  policy_arn = aws_iam_policy.s3_access[0].arn
  role       = aws_iam_role.eks_pod_role[0].name
}

resource "aws_iam_role_policy_attachment" "elasticache_access" {
  count      = var.enable_elasticache && var.eks_oidc_provider_arn != null ? 1 : 0
  policy_arn = aws_iam_policy.elasticache_access[0].arn
  role       = aws_iam_role.eks_pod_role[0].name
}

# AWS Load Balancer Controller Policy - Only create if eks_oidc_provider_arn is provided
resource "aws_iam_policy" "aws_load_balancer_controller" {
  count = var.eks_oidc_provider_arn != null ? 1 : 0
  name  = "${local.name_prefix}-alb-controller"
  description = "Policy for AWS Load Balancer Controller in ${local.name_prefix}"

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
          "elasticloadbalancing:DescribeTags"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:DescribeUserPoolClient",
          "acm:ListCertificates",
          "acm:DescribeCertificate",
          "iam:ListServerCertificates",
          "iam:GetServerCertificate",
          "waf-regional:GetWebACL",
          "waf-regional:GetWebACLForResource",
          "waf-regional:AssociateWebACL",
          "waf-regional:DisassociateWebACL",
          "wafv2:GetWebACL",
          "wafv2:GetWebACLForResource",
          "wafv2:AssociateWebACL",
          "wafv2:DisassociateWebACL",
          "shield:GetSubscriptionState",
          "shield:DescribeProtection",
          "shield:CreateProtection",
          "shield:DeleteProtection"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:AuthorizeSecurityGroupIngress",
          "ec2:RevokeSecurityGroupIngress"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateSecurityGroup"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateTags"
        ]
        Resource = "arn:aws:ec2:*:*:security-group/*"
        Condition = {
          StringEquals = {
            "ec2:CreateAction" = "CreateSecurityGroup"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateTags",
          "ec2:DeleteTags"
        ]
        Resource = "arn:aws:ec2:*:*:security-group/*"
        Condition = {
          Null = {
            "aws:RequestTag/elbv2.k8s.aws/cluster" = "false"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:AuthorizeSecurityGroupIngress",
          "ec2:RevokeSecurityGroupIngress",
          "ec2:DeleteSecurityGroup"
        ]
        Resource = "*"
        Condition = {
          Null = {
            "aws:ResourceTag/elbv2.k8s.aws/cluster" = "false"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "elasticloadbalancing:CreateLoadBalancer",
          "elasticloadbalancing:CreateTargetGroup"
        ]
        Resource = "*"
        Condition = {
          Null = {
            "aws:RequestTag/elbv2.k8s.aws/cluster" = "false"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "elasticloadbalancing:CreateListener",
          "elasticloadbalancing:DeleteListener",
          "elasticloadbalancing:CreateRule",
          "elasticloadbalancing:DeleteRule"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "elasticloadbalancing:AddTags",
          "elasticloadbalancing:RemoveTags"
        ]
        Resource = [
          "arn:aws:elasticloadbalancing:*:*:targetgroup/*/*",
          "arn:aws:elasticloadbalancing:*:*:loadbalancer/net/*/*",
          "arn:aws:elasticloadbalancing:*:*:loadbalancer/app/*/*"
        ]
        Condition = {
          Null = {
            "aws:RequestTag/elbv2.k8s.aws/cluster" = "false",
            "aws:ResourceTag/elbv2.k8s.aws/cluster" = "false"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "elasticloadbalancing:AddTags",
          "elasticloadbalancing:RemoveTags"
        ]
        Resource = [
          "arn:aws:elasticloadbalancing:*:*:listener/net/*/*/*",
          "arn:aws:elasticloadbalancing:*:*:listener/app/*/*/*",
          "arn:aws:elasticloadbalancing:*:*:listener-rule/net/*/*/*",
          "arn:aws:elasticloadbalancing:*:*:listener-rule/app/*/*/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "elasticloadbalancing:ModifyLoadBalancerAttributes",
          "elasticloadbalancing:SetIpAddressType",
          "elasticloadbalancing:SetSecurityGroups",
          "elasticloadbalancing:SetSubnets",
          "elasticloadbalancing:DeleteLoadBalancer",
          "elasticloadbalancing:ModifyTargetGroup",
          "elasticloadbalancing:ModifyTargetGroupAttributes",
          "elasticloadbalancing:DeleteTargetGroup"
        ]
        Resource = "*"
        Condition = {
          Null = {
            "aws:ResourceTag/elbv2.k8s.aws/cluster" = "false"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "elasticloadbalancing:RegisterTargets",
          "elasticloadbalancing:DeregisterTargets"
        ]
        Resource = "arn:aws:elasticloadbalancing:*:*:targetgroup/*/*"
      },
      {
        Effect = "Allow"
        Action = [
          "elasticloadbalancing:SetWebAcl",
          "elasticloadbalancing:ModifyListener",
          "elasticloadbalancing:AddListenerCertificates",
          "elasticloadbalancing:RemoveListenerCertificates",
          "elasticloadbalancing:ModifyRule"
        ]
        Resource = "*"
      }
    ]
  })

  tags = local.common_tags
}

# AWS Load Balancer Controller Role - Only create if eks_oidc_provider_arn is provided
resource "aws_iam_role" "aws_load_balancer_controller" {
  count = var.eks_oidc_provider_arn != null ? 1 : 0
  name  = "${local.name_prefix}-alb-controller"

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
  count      = var.eks_oidc_provider_arn != null ? 1 : 0
  policy_arn = aws_iam_policy.aws_load_balancer_controller[0].arn
  role       = aws_iam_role.aws_load_balancer_controller[0].name
} 