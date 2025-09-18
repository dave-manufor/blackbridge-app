# VPC ID
output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.blackbridge_production_vpc.id
}

# Public subnet
output "public_subnet_id" {
  description = "The ID of the public subnet"
  value       = aws_subnet.public_subnet.id
}

# Private subnets
output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value = [
    aws_subnet.private_subnet_1.id,
    aws_subnet.private_subnet_2.id,
  ]
}

# EC2 Security Group
output "ec2_sg_id" {
  description = "The ID of the EC2 security group"
  value       = aws_security_group.blackbridge_production_ec2_sg.id
}

# RDS Security Group
output "rds_sg_id" {
  description = "The ID of the RDS security group"
  value       = aws_security_group.blackbridge_production_rds_sg.id
}

# ElastiCache Security Group
output "elasticache_sg_id" {
  description = "The ID of the ElastiCache security group"
  value       = aws_security_group.blackbridge_production_elasticache_sg.id
}
