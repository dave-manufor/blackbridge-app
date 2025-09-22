output "bucket_name" {
    description = "The name of the S3 bucket for the React application."
    value       = aws_s3_bucket.blackbridge_production_files.bucket
  
}

output "cdn_domain_name" {
  description = "The domain name of the CloudFront distribution."
  value       = aws_cloudfront_distribution.blackbridge_production_cdn.domain_name
  
}

output "cdn_key_group_id" {
  description = "The ID of the CloudFront key group for signed URLs."
  value       = aws_cloudfront_key_group.blackbridge_key_group.id
  
}