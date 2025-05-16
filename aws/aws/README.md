# AWS Infrastructure Terraform Modules

This repository contains Terraform modules for deploying a modular AWS infrastructure with EKS as the mandatory component and optional components including RDS PostgreSQL, DynamoDB, S3, and ElastiCache Redis. The infrastructure is designed with security, scalability, and cost optimization in mind.

## Prerequisites

- Terraform >= 1.5.0
- AWS CLI configured with appropriate credentials
- kubectl for Kubernetes cluster management
- AWS account with sufficient permissions to create the required resources

## Infrastructure Components

### Mandatory Components
- VPC with public and private subnets across multiple AZs
- EKS (Elastic Kubernetes Service) cluster
  - Managed node groups with auto-scaling
  - IAM roles for cluster, node groups, and pods
  - OIDC provider for pod IAM roles
  - AWS Load Balancer Controller for ingress management
    - Automatically provisions ALB/NLB for Kubernetes ingress
    - Supports multiple ingress classes
    - Handles dynamic target group registration

### Optional Components
- RDS PostgreSQL
  - Multi-AZ deployment
  - Automated backups
  - Security groups
- DynamoDB
  - On-demand capacity
  - Point-in-time recovery
- S3 Bucket
  - Versioning enabled
  - Server-side encryption
- ElastiCache Redis
  - Multi-AZ deployment
  - Automated backups
  - Security groups

## IAM and Security

The infrastructure includes a centralized IAM module that manages:

### Mandatory IAM Roles
- EKS Cluster Role with `AmazonEKSClusterPolicy`
- EKS Node Group Role with:
  - `AmazonEKSWorkerNodePolicy`
  - `AmazonEKS_CNI_Policy`
  - `AmazonEC2ContainerRegistryReadOnly`
- EKS Pod Role with:
  - Base policy for ECR access
  - IRSA (IAM Roles for Service Accounts) setup

### Optional IAM Policies (Created conditionally)
- RDS Access Policy (when `enable_rds = true`)
  - Allows connecting to RDS instances
  - Allows describing DB instances and clusters
- DynamoDB Access Policy (when `enable_dynamodb = true`)
  - Allows CRUD operations on the DynamoDB table
  - Includes access to table indexes
- S3 Access Policy (when `enable_s3 = true`)
  - Allows basic S3 operations (Get, Put, Delete, List)
  - Scoped to the specific bucket
- ElastiCache Access Policy (when `enable_elasticache = true`)
  - Allows describing Redis clusters
  - Allows listing tags

## Usage

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. Copy the example variables file and update the values:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

3. Update the following required variables in `terraform.tfvars`:
   ```hcl
   project_name = "your-project-name"
   org_name     = "your-organization"
   squad_name   = "your-team-name"
   ```

4. Configure optional components by setting the corresponding enable flags:
   ```hcl
   enable_rds        = true
   enable_dynamodb   = true
   enable_s3         = true
   enable_elasticache = true
   ```

5. Initialize Terraform:
   ```bash
   terraform init
   ```

6. Review the planned changes:
   ```bash
   terraform plan
   ```

7. Apply the configuration:
   ```bash
   terraform apply
   ```

## Module Structure

```
.
├── main.tf                 # Root module configuration
├── variables.tf            # Root module variables
├── outputs.tf             # Root module outputs
├── terraform.tfvars       # Variable values (create from example)
├── modules/
│   ├── vpc/              # VPC and networking
│   ├── iam/              # IAM roles and policies
│   ├── eks/              # EKS cluster, node groups, and ALB Controller
│   ├── rds/              # RDS PostgreSQL (optional)
│   ├── dynamodb/         # DynamoDB table (optional)
│   ├── s3/               # S3 bucket (optional)
│   └── elasticache/      # ElastiCache Redis (optional)
```

## Using AWS Load Balancer Controller

The infrastructure includes AWS Load Balancer Controller for managing ingress in EKS. To use it:

1. Create an Ingress resource for your application:
   ```yaml
   apiVersion: networking.k8s.io/v1
   kind: Ingress
   metadata:
     name: app-ingress
     namespace: your-namespace
     annotations:
       alb.ingress.kubernetes.io/scheme: internet-facing
       alb.ingress.kubernetes.io/target-type: ip
       alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
   spec:
     ingressClassName: alb
     rules:
       - host: your-domain.com
         http:
           paths:
             - path: /
               pathType: Prefix
               backend:
                 service:
                   name: your-service
                   port:
                     number: 80
   ```

2. The controller will automatically:
   - Create an Application Load Balancer
   - Configure target groups
   - Update security groups
   - Manage SSL certificates (if configured)

## Using IAM Roles in Kubernetes

To use the IAM roles in your Kubernetes applications:

1. Create a Kubernetes ServiceAccount:
   ```yaml
   apiVersion: v1
   kind: ServiceAccount
   metadata:
     name: app-service-account
     namespace: default
     annotations:
       eks.amazonaws.com/role-arn: ${module.iam.eks_pod_role_arn}
   ```

2. Use the ServiceAccount in your pod/deployment:
   ```yaml
   spec:
     serviceAccountName: app-service-account
   ```

## Security Considerations

- All resources are tagged with:
  - Environment
  - Project
  - Organization
  - Squad
  - ManagedBy (terraform)
  - CreatedAt (ISO 8601 timestamp of resource creation)
- Security groups are configured with least privilege access
- IAM policies follow the principle of least privilege
- Optional components are isolated in private subnets
- RDS and ElastiCache use encrypted storage
- S3 buckets have versioning and encryption enabled

## Cost Optimization

- Use appropriate instance types for your workload
- Enable auto-scaling for EKS node groups
- Use on-demand capacity for DynamoDB
- Configure appropriate backup retention periods
- Monitor resource usage and adjust as needed

## Maintenance

- Regularly update the EKS cluster version
- Monitor and rotate database credentials
- Review and update IAM policies as needed
- Keep Terraform and provider versions up to date
- Regularly check for security updates

## Cleanup

To destroy the infrastructure:

```bash
terraform destroy
```

Note: This will delete all resources, including any data stored in RDS, DynamoDB, S3, and ElastiCache.

## Backend Setup

This infrastructure uses an S3 backend for Terraform state management. The backend is automatically created using the following naming convention:
- S3 bucket: `tfstate-${org_name}-${project_name}-${squad_name}-${environment}`
- DynamoDB table: `terraform-locks-${org_name}-${project_name}-${squad_name}-${environment}`

To set up the backend:

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Copy the example variables file and update the values:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

3. Update the following required variables in `terraform.tfvars`:
   ```hcl
   project_name = "your-project-name"
   org_name     = "your-organization"
   squad_name   = "your-team-name"
   ```

4. Initialize and apply the backend configuration:
   ```bash
   terraform init
   terraform apply
   ```

5. After the backend is created, update the root module's backend configuration. Create a file named `backend.tf` in the root directory with the following content (replace the values with the output from the backend setup):
   ```hcl
   terraform {
     backend "s3" {
       bucket         = "tfstate-your-org-your-project-your-squad-dev"
       key            = "terraform.tfstate"
       region         = "eu-west-2"
       dynamodb_table = "terraform-locks-your-org-your-project-your-squad-dev"
       encrypt        = true
     }
   }
   ```

6. Return to the root directory and reinitialize Terraform:
   ```bash
   cd ..
   terraform init -migrate-state
   ```

The backend provides:
- Secure state storage in S3
- State locking using DynamoDB
- Versioning of state files
- Server-side encryption
- Public access blocking
- Proper tagging for resource management

## License

This project is licensed under the MIT License - see the LICENSE file for details. 