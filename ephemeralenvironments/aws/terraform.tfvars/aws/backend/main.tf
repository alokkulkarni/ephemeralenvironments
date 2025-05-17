terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "backend" {
  source = "../modules/backend"

  environment   = var.environment
  project_name  = var.project_name
  org_name      = var.org_name
  squad_name    = var.squad_name
}

# Output the backend configuration
output "backend_config" {
  description = "Terraform backend configuration"
  value = {
    bucket         = module.backend.state_bucket_name
    key            = "terraform.tfstate"
    region         = var.aws_region
    dynamodb_table = module.backend.dynamodb_table_name
    encrypt        = true
  }
} 