resource "aws_s3_bucket" "upload_bucket" {
  bucket        = var.bucket_name
  force_destroy = true

  tags = {
    Name        = "User Upload Bucket"
    Environment = "dev"
  }
}

resource "aws_s3_bucket_accelerate_configuration" "upload_bucket_accel" {
  bucket = aws_s3_bucket.upload_bucket.id

  accelerate_status = "Enabled"
}


resource "aws_s3_bucket_public_access_block" "block_public" {
  bucket = aws_s3_bucket.upload_bucket.id

  block_public_acls       = true
  block_public_policy     = false
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "presigned_only" {
  bucket = aws_s3_bucket.upload_bucket.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid       = "AllowPresignedRead",
        Effect    = "Allow",
        Principal = "*",
        Action    = "s3:GetObject",
        Resource  = "${aws_s3_bucket.upload_bucket.arn}/*",
        Condition = {
          Bool = {
            "aws:SecureTransport" = "true"
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.block_public]
}

resource "aws_s3_bucket_cors_configuration" "cors_config" {
  bucket = aws_s3_bucket.upload_bucket.id

  cors_rule {
    allowed_origins = ["*"]
    allowed_methods = ["PUT", "POST", "GET", "HEAD"]
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }

  depends_on = [aws_s3_bucket_policy.presigned_only]
}
