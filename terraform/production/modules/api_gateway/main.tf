resource "aws_api_gateway_rest_api" "blackbridge_production_api" {
  name        = "${var.app_name}-api"
  description = "API Gateway for BlackBridge Production"

  tags = {
    Name        = "${var.app_name} API Gateway"
    Application = var.app_name
  }
}

# ANY method for /
resource "aws_api_gateway_method" "api_root_method" {
  rest_api_id   = aws_api_gateway_rest_api.blackbridge_production_api.id
  resource_id   = aws_api_gateway_rest_api.blackbridge_production_api.root_resource_id
  http_method   = "ANY"
  authorization = "NONE"
}

# New resource for /{proxy+}
resource "aws_api_gateway_resource" "api_proxy" {
  rest_api_id = aws_api_gateway_rest_api.blackbridge_production_api.id
  parent_id   = aws_api_gateway_rest_api.blackbridge_production_api.root_resource_id
  path_part   = "{proxy+}"
}

# ANY method for /{proxy+}
resource "aws_api_gateway_method" "api_proxy_method" {
  rest_api_id   = aws_api_gateway_rest_api.blackbridge_production_api.id
  resource_id   = aws_api_gateway_resource.api_proxy.id
  http_method   = "ANY"
  authorization = "NONE"

  request_parameters = {
    "method.request.path.proxy" = true
  }
}

resource "aws_api_gateway_integration" "api_root_integration" {
  rest_api_id             = aws_api_gateway_rest_api.blackbridge_production_api.id
  resource_id             = aws_api_gateway_rest_api.blackbridge_production_api.root_resource_id
  http_method             = aws_api_gateway_method.api_root_method.http_method
  type                    = "HTTP_PROXY"
  integration_http_method = "ANY"
  uri                     = "http://${var.ec2_public_ip}/"
}


# Integration for /{proxy+} to the EC2 instance
resource "aws_api_gateway_integration" "api_ec2_integration" {
  rest_api_id             = aws_api_gateway_rest_api.blackbridge_production_api.id
  resource_id             = aws_api_gateway_resource.api_proxy.id
  http_method             = aws_api_gateway_method.api_proxy_method.http_method
  type                    = "HTTP_PROXY"
  integration_http_method = "ANY"
  uri                     = "http://${var.ec2_public_ip}/{proxy}"

  request_parameters = {
    "integration.request.path.proxy" = "method.request.path.proxy"
  }
}


resource "aws_api_gateway_deployment" "blackbridge_production_api_deployment" {
  rest_api_id = aws_api_gateway_rest_api.blackbridge_production_api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_rest_api.blackbridge_production_api.body,
      aws_api_gateway_integration.api_root_integration.id, 
      aws_api_gateway_integration.api_ec2_integration.id,
      aws_api_gateway_method.api_proxy_method.id,
      aws_api_gateway_method.api_root_method.id
    ]))
  }

  depends_on = [
    aws_api_gateway_integration.api_ec2_integration,
    aws_api_gateway_integration.api_root_integration, 
    aws_api_gateway_method.api_proxy_method,
    aws_api_gateway_method.api_root_method
  ]
}

resource "aws_api_gateway_stage" "production" {
  deployment_id = aws_api_gateway_deployment.blackbridge_production_api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.blackbridge_production_api.id
  stage_name    = "production"

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_deployment.blackbridge_production_api_deployment
  ]
}
