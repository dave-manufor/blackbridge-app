# ACM certificate must be in us-east-1 for CloudFront
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# Request certificate
resource "aws_acm_certificate" "app_certificate" {
  provider          = aws.us_east_1
  domain_name       = var.app_entry_domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Create DNS record for validation
resource "aws_route53_record" "app_cert_validation" {
  zone_id = var.hosted_zone_id

  name    = one(aws_acm_certificate.app_certificate.domain_validation_options).resource_record_name
  type    = one(aws_acm_certificate.app_certificate.domain_validation_options).resource_record_type
  records = [one(aws_acm_certificate.app_certificate.domain_validation_options).resource_record_value]

  ttl = 60
}


# Validate the cert with Route53 record
resource "aws_acm_certificate_validation" "app_cert_validation" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.app_certificate.arn
  validation_record_fqdns = [aws_route53_record.app_cert_validation.fqdn]
}
