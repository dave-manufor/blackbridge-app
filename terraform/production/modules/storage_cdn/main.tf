resource "aws_s3_bucket" "blackbridge_production_files" {
  bucket = "${lower(replace(var.app_name, " ", "-"))}-user-files"

  tags = {
    Name        = "${var.app_name} User Files Bucket"
    Application = var.app_name
  }
}

resource "aws_s3_bucket_cors_configuration" "blackbridge_production_files_cors" {
  bucket = aws_s3_bucket.blackbridge_production_files.id

  cors_rule {
    id = "allow-frontend-uploads"

    # Your frontend origin(s)
    allowed_origins = [var.app_entry_domain_name]

    # Methods needed for presigned URLs
    allowed_methods = ["PUT", "POST", "HEAD"]

    # Allow headers browsers typically send
    allowed_headers = ["*"]

    # Expose headers you may want to read in JS
    expose_headers = ["ETag"]

    max_age_seconds = 3000
  }
}


resource "aws_s3_bucket_accelerate_configuration" "blackbridge_production_files_accel" {
  bucket = aws_s3_bucket.blackbridge_production_files.id
  status = "Enabled"
}

# The CloudFront Origin Access Control (OAC) to restrict direct S3 access
resource "aws_cloudfront_origin_access_control" "blackbridge_production_oac" {
  name                              = "${var.app_name}-oac"
  description                       = "OAC for CloudFront distribution"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# The bucket policy to only allow access from the OAC
resource "aws_s3_bucket_policy" "blackbridge_production_files_policy" {
  bucket = aws_s3_bucket.blackbridge_production_files.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.blackbridge_production_files.arn}/*"
        Condition = {
          "StringEquals" = {
            "aws:SourceArn" = "arn:aws:cloudfront::${var.aws_caller_account_id}:distribution/${aws_cloudfront_distribution.blackbridge_production_cdn.id}"
          }
        }
      }
    ]
  })
}
# CloudFront key group and public key for signed URLs
resource "aws_cloudfront_key_group" "blackbridge_key_group" {
  items = [aws_cloudfront_public_key.blackbridge_public_key.id]
  name  = "${var.app_name}-key-group"
}

resource "aws_cloudfront_public_key" "blackbridge_public_key" {
  encoded_key = file("${path.module}/cloudfront_public_key.pem")
  name        = "${var.app_name}-public-key"
  comment     = "Used for signed URLs for downloads"
}


resource "aws_cloudfront_distribution" "blackbridge_production_cdn" {
  enabled = true
  origin {
    domain_name              = aws_s3_bucket.blackbridge_production_files.bucket_regional_domain_name
    origin_id                = "s3_origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.blackbridge_production_oac.id
  }

  default_cache_behavior {
  target_origin_id       = "s3_origin"
  viewer_protocol_policy = "redirect-to-https"
  allowed_methods        = ["GET", "HEAD"]
  cached_methods         = ["GET", "HEAD"]
  compress               = true

  cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # AWS managed CachingOptimized policy
  trusted_key_groups     = [aws_cloudfront_key_group.blackbridge_key_group.id]
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
    Name        = "${var.app_name} CDN"
    Application = var.app_name
  }
}
