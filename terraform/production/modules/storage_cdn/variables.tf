variable "app_name" {
  type        = string
}

variable "aws_caller_account_id" {
  type        = string
}

variable "app_entry_domain_name" {
  description = "Domain name for the app entry point (e.g. app.example.com)"
  type        = string
}