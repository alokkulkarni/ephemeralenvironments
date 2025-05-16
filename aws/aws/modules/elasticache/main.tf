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

resource "aws_security_group" "redis" {
  name        = "${var.environment}-redis-sg"
  description = "Security group for Redis ElastiCache"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.environment}-redis-sg"
  })
}

resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.environment}-redis-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(local.common_tags, {
    Name = "${var.environment}-redis-subnet-group"
  })
}

resource "aws_elasticache_parameter_group" "main" {
  family = "redis6.x"
  name   = "${var.environment}-redis-params"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  tags = merge(local.common_tags, {
    Name = "${var.environment}-redis-params"
  })
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id          = "${var.environment}-redis"
  description                   = "Redis cluster for ${var.environment}"
  node_type                    = var.node_type
  num_cache_clusters           = var.num_cache_nodes
  port                         = 6379
  parameter_group_name         = aws_elasticache_parameter_group.main.name
  subnet_group_name            = aws_elasticache_subnet_group.main.name
  security_group_ids           = [aws_security_group.redis.id]
  automatic_failover_enabled   = false
  engine_version              = "6.2"
  at_rest_encryption_enabled   = true
  transit_encryption_enabled   = true

  tags = merge(local.common_tags, {
    Name = "${var.environment}-redis"
  })
} 