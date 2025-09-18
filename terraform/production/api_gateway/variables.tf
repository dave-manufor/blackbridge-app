variable "app_name" {
  description = "The name of the application. Used for tagging resources."
  type        = string
  default     = "BlackBridge Production"
  
}

variable "ec2_instance_id" {
  description = "The ID of the EC2 instance."
  type        = string
  
}

variable "ec2_sg_id" {
  description = "The security group ID for the EC2 instance."
  type        = string
  
}

variable "ec2_private_ip" {
  description = "The private IP address of the EC2 instance."
  type        = string

}

variable "react_bucket" {
  description = "The name of the S3 bucket for the React static site."
  type        = string
  
}

variable "react_bucket_id" {
  description = "The ID of the S3 bucket for the React static site."
  type        = string
  
}

variable "region" {
  description = "The AWS region."
  type        = string
  
}