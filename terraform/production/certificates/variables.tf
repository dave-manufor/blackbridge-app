variable "app_entry_domain_name" {
  description = "The domain name for the entry CloudFront distribution (e.g., app.example.com)."
  type        = string
  default     = "blackbridge-app.davman.dev"
}