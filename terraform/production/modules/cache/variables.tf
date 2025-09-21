variable "elasticache_node_type" {
  description = "The ElastiCache node type."
  type        = string
  default     = "cache.t2.micro" # Free tier eligible
}

variable "app_name" {
  type = string
}

variable "private_subnet_ids" {
  description = "The IDs of the private subnets."
  type        = list(string)
}

variable "elasticache_sg_id" {
  description = "The security group ID for the ElastiCache cluster."
  type        = string
}