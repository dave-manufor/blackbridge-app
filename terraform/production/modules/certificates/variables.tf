variable "app_entry_domain_name" {
  description = "Domain name for the app entry point (e.g. app.example.com)"
  type        = string
}

variable "hosted_zone_id" {
  description = "Route53 Hosted Zone ID for the domain"
  type        = string
}
