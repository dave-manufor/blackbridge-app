resource "aws_servicecatalogappregistry_application" "blackbridge" {
  name        = "Blackbridge"
  description = "BlackBridge Application"
}

# Returns a map like { "application" = "...", "application_tag" = {...} }
# Simulating application_tag if not auto-provided:
locals {
  application_tag = {
    "Application" = "BlackBridge",
    "Environment" = "dev",
  }
}
