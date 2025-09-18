variable "instance_type" {
  description = "The EC2 instance type."
  type        = string
  default     = "t2.micro" # Free tier eligible
}

variable "app_name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_id" {
  type = string
  
}

variable "ec2_sg_id" {
  type = string
}