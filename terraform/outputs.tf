output "database_url" {
  description = "Database connection URL"
  value       = "postgresql://${aws_db_instance.dev.username}:${aws_db_instance.dev.password}@${aws_db_instance.dev.address}:${aws_db_instance.dev.port}/${aws_db_instance.dev.db_name}"
  sensitive   = true
}

output "upload_bucket_name" {
  description = "Name of the S3 bucket for uploads"
  value       = aws_s3_bucket.upload_bucket.bucket
}