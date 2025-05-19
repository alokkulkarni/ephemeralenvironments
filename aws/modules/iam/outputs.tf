output "eks_cluster_role_arn" {
  description = "ARN of the EKS cluster role"
  value       = aws_iam_role.eks_cluster.arn
}

output "eks_node_group_role_arn" {
  description = "ARN of the EKS node group role"
  value       = aws_iam_role.eks_node_group.arn
}

output "eks_pod_role_arn" {
  description = "ARN of the EKS pod role"
  value       = var.eks_oidc_provider_arn != null ? aws_iam_role.eks_pod_role[0].arn : null
}

output "eks_pod_role_name" {
  description = "Name of the EKS pod role"
  value       = var.eks_oidc_provider_arn != null ? aws_iam_role.eks_pod_role[0].name : null
}

output "rds_access_policy_arn" {
  description = "ARN of the RDS access policy"
  value       = var.enable_rds ? aws_iam_policy.rds_access[0].arn : null
}

output "dynamodb_access_policy_arn" {
  description = "ARN of the DynamoDB access policy"
  value       = var.enable_dynamodb ? aws_iam_policy.dynamodb_access[0].arn : null
}

output "s3_access_policy_arn" {
  description = "ARN of the S3 access policy"
  value       = var.enable_s3 ? aws_iam_policy.s3_access[0].arn : null
}

output "elasticache_access_policy_arn" {
  description = "ARN of the ElastiCache access policy"
  value       = var.enable_elasticache ? aws_iam_policy.elasticache_access[0].arn : null
}

output "aws_load_balancer_controller_role_arn" {
  description = "ARN of the AWS Load Balancer Controller role"
  value       = var.eks_oidc_provider_arn != null ? aws_iam_role.aws_load_balancer_controller[0].arn : null
}

output "aws_load_balancer_controller_role_name" {
  description = "Name of the AWS Load Balancer Controller role"
  value       = var.eks_oidc_provider_arn != null ? aws_iam_role.aws_load_balancer_controller[0].name : null
}

output "aws_load_balancer_controller_policy_arn" {
  description = "ARN of the AWS Load Balancer Controller policy"
  value       = var.eks_oidc_provider_arn != null ? aws_iam_policy.aws_load_balancer_controller[0].arn : null
} 