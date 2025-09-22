terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }

    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }

  cloud {
    organization = "ecee-file-transfer"

    workspaces {
      name = "blackbridge-production"
    }
  }
}

# Create application using aliased 'application' provider
provider "aws" {
  region = var.region
  alias  = "application"
}

# Define the Service Catalog App Registry application
resource "aws_servicecatalogappregistry_application" "blackbridge" {
  provider = aws.application
  name        = var.app_name
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
  source = "./modules/networking"
  app_name = var.app_name
}

# Define the EC2 instance, using the network components
module "compute" {
  source               = "./modules/compute"
  vpc_id               = module.networking.vpc_id
  public_subnet_id     = module.networking.public_subnet_id
  ec2_sg_id            = module.networking.ec2_sg_id
  app_name             = var.app_name
}

# Define the RDS database instance
module "database" {
  source               = "./modules/database"
  private_subnet_ids   = module.networking.private_subnet_ids
  rds_sg_id            = module.networking.rds_sg_id
  rds_password         = var.rds_password
  app_name             = var.app_name
}

# Define the Elasticache Redis cluster
module "cache" {
  source               = "./modules/cache"
  private_subnet_ids   = module.networking.private_subnet_ids
  elasticache_sg_id    = module.networking.elasticache_sg_id
  app_name             = var.app_name
}

# Define the S3 bucket for user uploads and the CloudFront CDN
module "storage_cdn" {
  source               = "./modules/storage_cdn"
  app_name             = var.app_name
  app_entry_domain_name = var.app_entry_domain_name
  aws_caller_account_id = data.aws_caller_identity.current.account_id
}

# Define the S3 bucket for the static React application
module "static_site" {
  source               = "./modules/static_site"
  app_name             = var.app_name
  aws_caller_account_id = data.aws_caller_identity.current.account_id
}

# Define the API Gateway
module "api_gateway" {
  source               = "./modules/api_gateway"
  ec2_instance_id      = module.compute.instance_id
  ec2_sg_id            = module.networking.ec2_sg_id
  ec2_public_ip       = module.compute.public_ip
  react_bucket_id      = module.static_site.react_bucket_id
  react_bucket         = module.static_site.react_bucket
  app_name             = var.app_name
  region               = var.region
}

module "certificates" {
  source                = "./modules/certificates"
  app_entry_domain_name = var.app_entry_domain_name
  hosted_zone_id        = var.hosted_zone_id
}

# Define the CloudFront distribution that serves the React app and proxies /api to API Gateway
module "cloudfront_entry" {
  source               = "./modules/cloudfront_entry"
  app_name             = var.app_name
  app_cert_arn         = module.certificates.app_cert_arn
  app_cert_domain_name = module.certificates.app_cert_domain_name
  hosted_zone_id      = var.hosted_zone_id
  static_site_domain_name = module.static_site.bucket_regional_domain_name
  static_site_website_endpoint = module.static_site.bucket_website_endpoint
  api_gateway_domain_name = module.api_gateway.api_gateway_domain_name
  api_gateway_stage_name  = module.api_gateway.stage_name
  static_site            = module.static_site
  api_gateway           = module.api_gateway
  aws_caller_account_id = data.aws_caller_identity.current.account_id
}