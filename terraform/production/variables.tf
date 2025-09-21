variable "app_name" {
  description = "The name of the application. Used for tagging resources."
  type        = string
  default     = "blackbridge-production"
}

variable "app_entry_domain_name" {
  description = "The domain name for the entry CloudFront distribution (e.g., app.example.com)."
  type        = string
  default     = "blackbridge-app.davman.dev"
}

variable "hosted_zone_id" {
  description = "The Route 53 Hosted Zone ID."
  type        = string
  default     = "Z08547192ZLS95H6WEGCL"
}

variable "region" {
  description = "The AWS region."
  type        = string
  default     = "us-east-1"
}


variable "vpc_cidr_block" {
  description = "The CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "The CIDR block for the public subnet."
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_subnet_cidrs" {
  description = "The CIDR blocks for the private subnets."
  type        = list(string)
  default     = ["10.0.2.0/24", "10.0.3.0/24"]
}

variable "rds_password" {
  description = "The master password for the RDS database."
  type        = string
  sensitive   = true
}