output "app_cert_arn" {
  description = "The ARN of the ACM certificate for the app CloudFront distribution."
  value       = aws_acm_certificate.app_cert.arn
  
}

output "app_cert_domain_name" {
  description = "The domain name for the ACM certificate."
  value       = aws_acm_certificate.app_cert.domain_name
  
}

output "app_cert_domain_validation_options" {
  description = "The domain validation options for the ACM certificate."
  value       = aws_acm_certificate.app_cert.domain_validation_options
  
}