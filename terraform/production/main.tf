terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

# Create application using aliased 'application' provider
provider "aws" {
  alias = "application"
}

# Define the Service Catalog App Registry application
resource "aws_servicecatalogappregistry_application" "blackbridge" {
  provider = aws.application
  name        = "Blackbridge"
  description = "BlackBridge Application"
}

# Define the AWS provider and the region
provider "aws" {
  region = var.region
  default_tags {
    tags = aws_servicecatalogappregistry_application.blackbridge.application_tag
  }
}

# Get the current AWS account details
data "aws_caller_identity" "current" {}


# Source the security groups, VPC and other core network components first
module "networking" {
  source = "./networking"
  app_name = var.app_name
}

# Define the EC2 instance, using the network components
module "compute" {
  source               = "./compute"
  vpc_id               = module.networking.vpc_id
  public_subnet_id     = module.networking.public_subnet_id
  ec2_sg_id            = module.networking.ec2_sg_id
  app_name             = var.app_name
}

# Define the RDS database instance
module "database" {
  source               = "./database"
  private_subnet_ids   = module.networking.private_subnet_ids
  rds_sg_id            = module.networking.rds_sg_id
  rds_password         = var.rds_password
  app_name             = var.app_name
}

# Define the Elasticache Redis cluster
module "cache" {
  source               = "./cache"
  private_subnet_ids   = module.networking.private_subnet_ids
  elasticache_sg_id    = module.networking.elasticache_sg_id
  app_name             = var.app_name
}

# Define the S3 bucket for user uploads and the CloudFront CDN
module "storage_cdn" {
  source               = "./storage_cdn"
  app_name             = var.app_name
  aws_caller_account_id = data.aws_caller_identity.current.account_id
}

# Define the S3 bucket for the static React application
module "static_site" {
  source               = "./static_site"
  app_name             = var.app_name
  aws_caller_account_id = data.aws_caller_identity.current.account_id
}

# Define the API Gateway
module "api_gateway" {
  source               = "./api_gateway"
  ec2_instance_id      = module.compute.instance_id
  ec2_sg_id            = module.networking.ec2_sg_id
  ec2_private_ip       = module.compute.private_ip
  react_bucket_id      = module.static_site.react_bucket_id
  react_bucket         = module.static_site.react_bucket
  app_name             = var.app_name
  region               = var.region
}