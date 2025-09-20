output "app_cloudfront_domain" {
  description = "The domain name of the CloudFront distribution for the app (React + /api -> API Gateway)."
  value       = aws_cloudfront_distribution.app_distribution.domain_name
}
