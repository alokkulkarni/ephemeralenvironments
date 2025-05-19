# Remove the terraform block since it's now in versions.tf

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

resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  version  = var.cluster_version
  role_arn = var.cluster_role_arn

  vpc_config {
    subnet_ids              = var.subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = true
    security_group_ids      = [aws_security_group.eks_cluster.id]
  }

  tags = merge(local.common_tags, {
    Name = var.cluster_name
  })

  depends_on = [
    aws_security_group.eks_cluster
  ]
}

resource "aws_security_group" "eks_cluster" {
  name        = "${var.cluster_name}-cluster-sg"
  description = "Security group for EKS cluster"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.cluster_name}-cluster-sg"
  })
}

resource "aws_eks_node_group" "main" {
  for_each = var.node_groups

  cluster_name    = aws_eks_cluster.main.name
  node_group_name = each.key
  node_role_arn   = var.node_role_arn
  subnet_ids      = var.subnet_ids

  scaling_config {
    desired_size = each.value.desired_size
    min_size     = each.value.min_size
    max_size     = each.value.max_size
  }

  instance_types = each.value.instance_types

  tags = merge(local.common_tags, {
    Name = "${var.cluster_name}-${each.key}"
  })
}

# Create OIDC provider for the cluster
resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["9e99a48a9960b14926bb7f3b02e22da2b0ab7280"]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer

  tags = merge(local.common_tags, {
    Name = "${var.cluster_name}-oidc-provider"
  })
}

# Create ServiceAccount for AWS Load Balancer Controller
resource "kubernetes_service_account" "aws_load_balancer_controller" {
  metadata {
    name      = "aws-load-balancer-controller"
    namespace = "kube-system"
    annotations = {
      "eks.amazonaws.com/role-arn" = var.aws_load_balancer_controller_role_arn
    }
    labels = {
      "app.kubernetes.io/managed-by" = "Helm"
    }
  }

  depends_on = [
    aws_eks_cluster.main,
    aws_eks_node_group.main
  ]

  lifecycle {
    replace_triggered_by = [
      aws_eks_cluster.main,
      aws_eks_node_group.main
    ]
  }
}

# Create IngressClass for AWS Load Balancer Controller
resource "kubernetes_ingress_class_v1" "alb" {
  metadata {
    name = "alb"
    annotations = {
      "ingressclass.kubernetes.io/is-default-class" = "true"
      "meta.helm.sh/release-name"                   = "aws-load-balancer-controller"
      "meta.helm.sh/release-namespace"              = "kube-system"
    }
    labels = {
      "app.kubernetes.io/managed-by" = "Helm"
      "app.kubernetes.io/name"       = "aws-load-balancer-controller"
      "helm.sh/chart"               = "aws-load-balancer-controller"
    }
  }
  spec {
    controller = "ingress.k8s.aws/alb"
  }

  depends_on = [
    aws_eks_cluster.main,
    aws_eks_node_group.main,
    kubernetes_service_account.aws_load_balancer_controller
  ]

  lifecycle {
    replace_triggered_by = [
      aws_eks_cluster.main,
      aws_eks_node_group.main
    ]
  }
}

# AWS Load Balancer Controller
resource "helm_release" "aws_load_balancer_controller" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  namespace  = "kube-system"
  version    = "1.7.1"

  set {
    name  = "clusterName"
    value = aws_eks_cluster.main.name
  }

  set {
    name  = "serviceAccount.create"
    value = "false"
  }

  set {
    name  = "serviceAccount.name"
    value = kubernetes_service_account.aws_load_balancer_controller.metadata[0].name
  }

  set {
    name  = "region"
    value = var.aws_region
  }

  set {
    name  = "vpcId"
    value = var.vpc_id
  }

  depends_on = [
    aws_eks_cluster.main,
    aws_eks_node_group.main,
    kubernetes_service_account.aws_load_balancer_controller,
    kubernetes_ingress_class_v1.alb
  ]

  lifecycle {
    replace_triggered_by = [
      kubernetes_service_account.aws_load_balancer_controller
    ]
  }
}

# Get current AWS account ID
data "aws_caller_identity" "current" {} 