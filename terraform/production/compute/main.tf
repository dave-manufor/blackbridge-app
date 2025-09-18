resource "tls_private_key" "ec2_ssh_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "blackbridge_production_key" {
  key_name   = "${var.app_name}-ssh-key"
  public_key = tls_private_key.ec2_ssh_key.public_key_openssh

  tags = {
    Name        = "${var.app_name} SSH Key"
    Application = var.app_name
  }
}

resource "aws_instance" "blackbridge_production_ec2" {
  ami           = "ami-053b04d161d7634d2" # Example Ubuntu Server 20.04 LTS (HVM)
  instance_type = var.instance_type
  key_name      = aws_key_pair.blackbridge_production_key.key_name
  vpc_security_group_ids = [var.ec2_sg_id]
  subnet_id              = var.public_subnet_id
  associate_public_ip_address = true

  tags = {
    Name        = "${var.app_name} EC2 Instance"
    Application = var.app_name
  }
}
