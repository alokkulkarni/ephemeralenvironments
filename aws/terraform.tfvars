# Organization and Project Information
project_name = "paymentsapi"
org_name     = "productsandchannel"
squad_name   = "paymentsquad"

environment = "dev"
aws_region  = "eu-west-2"

# Environment Configuration
lifetimedays = 7
duration     = 7

# VPC Configuration
vpc_cidr             = "10.0.0.0/16"
availability_zones   = ["eu-west-2a", "eu-west-2b"]
private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
public_subnet_cidrs  = ["10.0.101.0/24", "10.0.102.0/24"]

# EKS Configuration
cluster_name        = "dev-eks-cluster"
cluster_version     = "1.32"
eks_cluster_version = "1.32"
eks_node_groups = {
  general = {
    desired_size   = 2
    min_size       = 1
    max_size       = 3
    instance_types = ["t3.medium"]
  }
}

# Optional Infrastructure Configuration
enable_rds         = false
rds_db_name        = "testdb"
rds_username       = "admin"
rds_password       = "test-password-123"  # In production, use a secure secret management solution
rds_instance_class = "db.t3.micro"

enable_dynamodb     = false
dynamodb_table_name = "test-table"

enable_s3      = false
s3_bucket_name = "test-bucket-123456789"

enable_elasticache    = false
elasticache_node_type = "cache.t3.micro"
elasticache_num_nodes = 1
