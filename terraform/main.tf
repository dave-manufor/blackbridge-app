terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  cloud {
    organization = "ecee-file-transfer"

    workspaces {
      name = "terraform-dev"
    }
  }
}