# Environment Configuration
environment = "dev"
aws_region = "eu-west-2"

# Project Information
project_name = "TestProject26"
org_name = "productsandchannel"
squad_name = "Neptune26"

# Optional Components
enable_rds = "false"
enable_dynamodb = "false"
enable_s3 = "false"
enable_elasticache = "false"

# Environment life cycle duration
lifetimeDays = "7"
duration = ""

# VPC Configuration
vpc_cidr = "10.0.0.0/16"
availability_zones = ["eu-west-2a", "eu-west-2b"]
private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
public_subnet_cidrs  = ["10.0.101.0/24", "10.0.102.0/24"]

# EKS Configuration
cluster_name = "TestProject26-dev"
cluster_version = "1.32"
node_instance_types = ["t3.medium"]
desired_size = 2
max_size = 4
min_size = 1

# Optional Component Configurations
db_name = "TestProject26_dev"
db_instance_class = "db.t3.medium"
db_allocated_storage = 20

# DynamoDB Configuration
dynamodb_tables = {
    "TestProject26-dev" = {
        billing_mode = "PAY_PER_REQUEST"
        hash_key = "id"
        attributes = [
        {
            name = "id"
            type = "S"
        }
        ]
    }
}


# S3 Configuration
s3_buckets = {
    "TestProject26-dev" = {
        versioning = true
        encryption = true
    }
}


# ElastiCache Configuration
elasticache_cluster = {
    engine = "redis"
    node_type = "cache.t3.micro"
    num_cache_nodes = 1
    port = 6379
}
