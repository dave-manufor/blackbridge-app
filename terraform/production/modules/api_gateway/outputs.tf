output "api_gateway_invoke_url" {
  description = "The base URL to invoke the API Gateway."
  value       = "https://${aws_api_gateway_rest_api.blackbridge_production_api.id}.execute-api.${var.region}.amazonaws.com/${aws_api_gateway_stage.production.stage_name}"
}

output "api_gateway_domain_name" {
  description = "The domain name of the API Gateway."
  value       = "${aws_api_gateway_rest_api.blackbridge_production_api.id}.execute-api.${var.region}.amazonaws.com"
  
}

output "api_gateway_id" {
  description = "The API Gateway REST API id."
  value       = aws_api_gateway_rest_api.blackbridge_production_api.id
}

output "stage_name" {
  description = "API Gateway stage name."
  value       = aws_api_gateway_stage.production.stage_name
}
