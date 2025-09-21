output "app_cert_arn" {
  description = "ARN of the validated ACM certificate"
  value       = aws_acm_certificate_validation.app_cert_validation.certificate_arn
}

output "app_cert_domain_name" {
  description = "Domain name on the certificate"
  value       = aws_acm_certificate.app_cert.domain_name
}
