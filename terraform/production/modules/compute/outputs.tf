output "instance_id" {
  description = "The ID of the EC2 instance"
  value       = aws_instance.blackbridge_production_ec2.id
  
}

output "private_ip" {
  description = "The private IP address of the EC2 instance"
  value       = aws_instance.blackbridge_production_ec2.private_ip
  
}

output "public_ip" {
  description = "The public IP address of the EC2 instance."
  value       = aws_instance.blackbridge_production_ec2.public_ip
  
}

output "ssh_private_key" {
  description = "The private key to SSH into the EC2 instance. Log this somewhere safe!"
  value       = tls_private_key.ec2_ssh_key.private_key_pem
  sensitive   = true
  
}