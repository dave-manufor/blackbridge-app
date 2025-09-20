# CloudFront distribution that routes /api/* -> API Gateway, default -> React S3
resource "aws_cloudfront_origin_access_control" "react_oac" {
  name                              = "${var.app_name}-react-oac"
  description                       = "OAC for CloudFront -> React S3"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "app_distribution" {
  enabled             = true
  default_root_object = "index.html"

  origin {
    domain_name              = var.static_site_domain_name
    origin_id                = var.static_site_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.react_oac.id
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
    path_pattern           = "/api/*"
    target_origin_id       = var.api_gateway_origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    compress               = true

    forwarded_values {
      query_string = true
      headers      = var.allowed_api_headers
      cookies {
        forward = "all"
      }
    }
  }

  # SPA fallback: serve index.html for 404/403 so client-side routes work
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
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

resource "aws_s3_bucket_policy" "react_bucket_policy" {
  bucket = var.static_site.react_bucket

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action = "s3:GetObject"
        Resource = "arn:aws:s3:::${var.static_site.react_bucket}/*"
        Condition = {
          StringEquals = {
            "aws:SourceArn" = "arn:aws:cloudfront::${var.aws_caller_account_id}:distribution/${aws_cloudfront_distribution.app_distribution.id}"
          }
        }
      }
    ]
  })

  depends_on = [ aws_cloudfront_distribution.app_distribution ]
}

