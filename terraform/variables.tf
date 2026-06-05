variable "db_username" {
  default = "master"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "bucket_name" {
    default = "blackbridge-upload-bucket"
}
