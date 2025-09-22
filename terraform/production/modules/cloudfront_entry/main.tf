# Cache policy for API Gateway to prevent caching
resource "aws_cloudfront_cache_policy" "api_no_cache" {
  name        = "${var.app_name}-api-no-cache"
  default_ttl = 0
  max_ttl     = 0
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "all"
    }
    cookies_config {
      cookie_behavior = "all"
    }
  }
}

resource "aws_cloudfront_origin_request_policy" "api_forward" {
  name = "${var.app_name}-api-forward-all"

  headers_config {
    header_behavior = "whitelist"
    headers {
      items = var.allowed_api_headers
    }
  }

  query_strings_config {
    query_string_behavior = "all"
  }

  cookies_config {
    cookie_behavior = "all"
  }
}


# CloudFront distribution that routes /api/* -> API Gateway, default -> React S3
resource "aws_cloudfront_distribution" "app_distribution" {
  enabled             = true
  default_root_object = "index.html"

  aliases = [var.app_cert_domain_name]

  origin {
    domain_name              = var.static_site_website_endpoint
    origin_id                = var.static_site_origin_id

    custom_origin_config {
    origin_protocol_policy = "http-only" # website endpoints don’t support HTTPS
    http_port              = 80
    https_port             = 443
    origin_ssl_protocols   = ["TLSv1.2"]
  }
  }

  origin {
    domain_name = var.api_gateway_domain_name
    origin_id   = var.api_gateway_origin_id
    origin_path = "/${var.api_gateway_stage_name}"

    custom_origin_config {
      origin_protocol_policy = "https-only"
      http_port              = 80
      https_port             = 443
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = var.static_site_origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

  }

  ordered_cache_behavior {
  path_pattern           = "/api"
  target_origin_id       = var.api_gateway_origin_id
  viewer_protocol_policy = "redirect-to-https"
  allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
  cached_methods         = ["GET", "HEAD", "OPTIONS"]
  compress               = true

  cache_policy_id = aws_cloudfront_cache_policy.api_no_cache.id
  origin_request_policy_id = aws_cloudfront_origin_request_policy.api_forward.id
  }


  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = var.api_gateway_origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    compress               = true

    cache_policy_id = aws_cloudfront_cache_policy.api_no_cache.id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.api_forward.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.app_cert_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name        = "${var.app_name} App CDN"
    Application = var.app_name
  }

  depends_on = [
   var.static_site,
   var.api_gateway
  ]
}

#Add DNS record for the CloudFront distribution
resource "aws_route53_record" "app_entry" {
  zone_id = var.hosted_zone_id
  name    = var.app_cert_domain_name
  type    = "CNAME"
  ttl     = 300
  records = [aws_cloudfront_distribution.app_distribution.domain_name]

  lifecycle {
    create_before_destroy = true
  }
}