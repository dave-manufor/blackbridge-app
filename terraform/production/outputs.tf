output "ec2_public_ip" {
  description = "The public IP address of the EC2 instance."
  value       = module.compute.public_ip
}

output "ssh_private_key" {
  description = "The private key to SSH into the EC2 instance. Log this somewhere safe!"
  value       = module.compute.ssh_private_key
  sensitive   = true
}

output "rds_endpoint" {
  description = "The endpoint for the Postgres RDS instance."
  value       = module.database.rds_endpoint
}

output "redis_endpoint" {
  description = "The primary endpoint for the Redis ElastiCache cluster."
  value       = module.cache.redis_endpoint
}

output "user_files_bucket_name" {
  description = "The name of the S3 bucket for user uploads."
  value       = module.storage_cdn.bucket_name
  
}

output "cdn_domain_name" {
  description = "The domain name of the CloudFront distribution."
  value       = module.storage_cdn.cdn_domain_name
}

output "react_app_url" {
  description = "The URL of the static React application."
  value       = "http://${module.static_site.bucket_regional_domain_name}"
}

output "api_gateway_invoke_url" {
  description = "The base URL to invoke the API Gateway."
  value       = module.api_gateway.api_gateway_invoke_url
}
