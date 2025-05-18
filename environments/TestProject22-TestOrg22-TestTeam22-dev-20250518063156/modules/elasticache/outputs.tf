output "endpoint" {
  description = "The address of the endpoint for the primary node in the replication group"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "port" {
  description = "The port number on which each of the nodes accepts connections"
  value       = aws_elasticache_replication_group.main.port
}

output "security_group_id" {
  description = "The security group ID of the ElastiCache cluster"
  value       = aws_security_group.redis.id
}

output "subnet_group_name" {
  description = "The name of the subnet group"
  value       = aws_elasticache_subnet_group.main.name
} 