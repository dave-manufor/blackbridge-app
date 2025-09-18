resource "aws_api_gateway_rest_api" "blackbridge_production_api" {
  name        = "${var.app_name}-api"
  description = "API Gateway for BlackBridge Production"

  tags = {
    Name        = "${var.app_name} API Gateway"
    Application = var.app_name
  }
}

# Resource for the /api path
resource "aws_api_gateway_resource" "api_resource" {
  rest_api_id = aws_api_gateway_rest_api.blackbridge_production_api.id
  parent_id   = aws_api_gateway_rest_api.blackbridge_production_api.root_resource_id
  path_part   = "api"
}

# The greedy path for the React app
resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.blackbridge_production_api.id
  parent_id   = aws_api_gateway_rest_api.blackbridge_production_api.root_resource_id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "api_ec2_method" {
  rest_api_id   = aws_api_gateway_rest_api.blackbridge_production_api.id
  resource_id   = aws_api_gateway_resource.api_resource.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "proxy_s3_method" {
  rest_api_id   = aws_api_gateway_rest_api.blackbridge_production_api.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "GET"
  authorization = "NONE"

  request_parameters = {
    "method.request.path.proxy" = true
  }
}

# Integration for the /api path to the EC2 instance
resource "aws_api_gateway_integration" "api_ec2_integration" {
  rest_api_id = aws_api_gateway_rest_api.blackbridge_production_api.id
  resource_id = aws_api_gateway_resource.api_resource.id
  http_method = aws_api_gateway_method.api_ec2_method.http_method
  type        = "HTTP_PROXY"
  integration_http_method = "ANY"
  uri         = "http://${var.ec2_private_ip}/{proxy+}"

  depends_on = [aws_api_gateway_rest_api.blackbridge_production_api]
}

# S3 IAM Role for API Gateway
resource "aws_iam_role" "api_gateway_s3_access" {
  name = "${var.app_name}-api-gateway-s3-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action    = "sts:AssumeRole",
        Effect    = "Allow",
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })
}

# Policy to allow API Gateway to access S3
resource "aws_iam_role_policy" "api_gateway_s3_policy" {
  name = "${var.app_name}-api-gateway-s3-policy"
  role = aws_iam_role.api_gateway_s3_access.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect   = "Allow",
        Action   = ["s3:GetObject"],
        Resource = "arn:aws:s3:::${var.react_bucket}/*"
      }
    ]
  })
}


# Integration for all other paths to the S3 bucket
resource "aws_api_gateway_integration" "proxy_s3_integration" {
  rest_api_id = aws_api_gateway_rest_api.blackbridge_production_api.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy_s3_method.http_method
  type        = "AWS"
  integration_http_method = "GET"
  uri         = "arn:aws:apigateway:${var.region}:s3:path/${var.react_bucket}/{proxy}"
  credentials = aws_iam_role.api_gateway_s3_access.arn
  request_parameters = {
    "integration.request.path.proxy" = "method.request.path.proxy"
  }
}

# Handle 403 Forbidden responses from S3
resource "aws_api_gateway_gateway_response" "default_4xx" {
  rest_api_id = aws_api_gateway_rest_api.blackbridge_production_api.id
  response_type = "DEFAULT_4XX"

  status_code = "200"

  response_parameters = {
    "gatewayresponse.header.Content-Type" = "'text/html'"
  }

  response_templates = {
  "text/html" = "$util.base64Encode($input.path('$'))"
}
}

# Handle 404 Not Found responses
resource "aws_api_gateway_gateway_response" "resource_not_found" {
  rest_api_id   = aws_api_gateway_rest_api.blackbridge_production_api.id
  response_type = "RESOURCE_NOT_FOUND"

  status_code = "200"

  response_parameters = {
    "gatewayresponse.header.Content-Type" = "'text/html'"
  }

  response_templates = {
  "text/html" = "$util.base64Encode($input.path('$'))"
}
}


resource "aws_api_gateway_deployment" "blackbridge_production_api_deployment" {
  rest_api_id = aws_api_gateway_rest_api.blackbridge_production_api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_rest_api.blackbridge_production_api.body,
      aws_api_gateway_resource.api_resource.id,
      aws_api_gateway_resource.proxy.id,
      aws_api_gateway_integration.api_ec2_integration.id,
      aws_api_gateway_integration.proxy_s3_integration.id,
      aws_api_gateway_method.api_ec2_method.id,
      aws_api_gateway_method.proxy_s3_method.id
    ]))
  }

  depends_on = [
    aws_api_gateway_integration.api_ec2_integration,
    aws_api_gateway_integration.proxy_s3_integration,
    aws_api_gateway_method.api_ec2_method,
    aws_api_gateway_method.proxy_s3_method
  ]
}

resource "aws_api_gateway_stage" "production" {
  deployment_id = aws_api_gateway_deployment.blackbridge_production_api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.blackbridge_production_api.id
  stage_name    = "production"
}
