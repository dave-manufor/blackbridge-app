output "react_bucket_id" {
  description = "The ID of the S3 bucket for the React application."
  value       = aws_s3_bucket.blackbridge_production_react_app.id
  
}

output "react_bucket" {
  description = "The name of the S3 bucket for the React application."
  value       = aws_s3_bucket.blackbridge_production_react_app.bucket
  
}

output "bucket_regional_domain_name" {
  description = "The regional domain name of the S3 bucket for the React application."
  value       = aws_s3_bucket.blackbridge_production_react_app.bucket_regional_domain_name
  
}

output "bucket_website_endpoint" {
  description = "The website endpoint of the S3 bucket for the React application."
  value       = aws_s3_bucket_website_configuration.blackbridge_production_react_app_website.website_endpoint
  
}