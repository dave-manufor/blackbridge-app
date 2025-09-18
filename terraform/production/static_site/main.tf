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

resource "aws_s3_bucket_public_access_block" "react_app_block" {
  bucket = aws_s3_bucket.blackbridge_production_react_app.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}


resource "aws_s3_bucket_policy" "blackbridge_production_react_app_policy" {
  bucket = aws_s3_bucket.blackbridge_production_react_app.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.blackbridge_production_react_app.arn}/*"
      }
    ]
  })
}


