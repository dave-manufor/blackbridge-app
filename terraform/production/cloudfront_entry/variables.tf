variable "app_name" {
  description = "The name of the application."
  type        = string
}

variable "static_site_domain_name" {
    description = "The domain name for the static site"
    type        = string
}

variable "static_site_origin_id" {
    description = "The origin ID for the static site"
    type        = string
    default     = "react_s3_origin"
}

variable "static_site_website_endpoint" {
    description = "The website endpoint for the static site S3 bucket"
    type        = string
  
}

variable "api_gateway_domain_name" {
    description = "The domain name for the API Gateway"
    type        = string
}

variable "api_gateway_origin_id" {
    description = "The origin ID for the API Gateway"
    type        = string
    default     = "api_gateway_origin"
}

variable "api_gateway_stage_name" {
    description = "The stage name for the API Gateway"
    type        = string
}

variable "allowed_api_headers" {
    description = "List of headers to forward to API Gateway"
    type        = list(string)
    default     = ["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With", "Referer", "User-Agent", "Access-Control-Request-Method", "Access-Control-Request-Headers", "x-otp-authorization", "x-download-authorization"]
}

variable "static_site" {
    description = "The static site module output"
    type        = any
}

variable "api_gateway" {
    description = "The API Gateway module output"
    type        = any
}

variable "aws_caller_account_id" {
    description = "The AWS caller account ID"
    type        = string
}

variable "app_cert_arn" {
  description = "The ARN of the ACM certificate for the entry CloudFront distribution."
  type        = string
  
}

