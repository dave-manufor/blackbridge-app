variable "rds_instance_type" {
  description = "The RDS instance type."
  type        = string
  default     = "db.t2.micro" # Free tier eligible
}

variable "rds_username" {
  description = "The master username for the RDS database."
  type        = string
  default     = "postgres"
}

variable "rds_password" {
  description = "The master password for the RDS database."
  type        = string
  sensitive   = true
}

variable "app_name" {
  type = string
}

variable "private_subnet_ids" {
  description = "The IDs of the private subnets."
  type        = list(string)
}

variable "rds_sg_id" {
  description = "The security group ID for the RDS instance."
  type        = string
}