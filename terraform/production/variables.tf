variable "app_name" {
  description = "The name of the application. Used for tagging resources."
  type        = string
  default     = "blackbridge-production"
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


# variable "public_key" {
#   description = "Public key to use for the EC2 instance."
#   type = string
# }

# variable "private_key" {
#   description = "Private key to use for the EC2 instance."
#   type = string
#   sensitive = true
# }