output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "eks_cluster_endpoint" {
  description = "The endpoint for the EKS cluster"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_name" {
  description = "The name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "eks_cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "rds_endpoint" {
  description = "The endpoint of the RDS instance"
  value       = var.enable_rds ? module.rds[0].endpoint : null
}

output "dynamodb_table_name" {
  description = "The name of the DynamoDB table"
  value       = var.enable_dynamodb ? module.dynamodb[0].table_name : null
}

output "s3_bucket_name" {
  description = "The name of the S3 bucket"
  value       = var.enable_s3 ? module.s3[0].bucket_name : null
}

output "elasticache_endpoint" {
  description = "The endpoint of the ElastiCache cluster"
  value       = var.enable_elasticache ? module.elasticache[0].endpoint : null
}

output "alb_dns_name" {
  description = "The DNS name of the load balancer"
  value       = module.alb.dns_name
} 