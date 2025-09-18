resource "aws_s3_bucket" "blackbridge_production_react_app" {
  bucket = "${lower(replace(var.app_name, " ", "-"))}-react-app"

  tags = {
    Name        = "${var.app_name} React App Bucket"
    Application = var.app_name
  }
}

resource "aws_s3_bucket_website_configuration" "blackbridge_production_react_app_website" {
  bucket = aws_s3_bucket.blackbridge_production_react_app.id

  index_document {
    suffix = "index.html"
  }
}

resource "aws_s3_bucket_policy" "blackbridge_production_react_app_policy" {
  bucket = aws_s3_bucket.blackbridge_production_react_app.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.blackbridge_production_react_app.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = "arn:aws:cloudfront::${var.aws_caller_account_id}:distribution/${aws_cloudfront_distribution.blackbridge_production_react_app.id}"
          }
        }
      }
    ]
  })
}

