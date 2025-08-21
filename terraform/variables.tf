variable "db_username" {
  default = "master"
}

variable "db_password" {
  default = "password123"
  sensitive = true
}

variable "bucket_name" {
    default = "blackbridge-upload-bucket"
}
