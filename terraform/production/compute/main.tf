data "aws_ami" "amazon_linux" {
  most_recent = true

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  owners = ["amazon"]
}

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
  ami           = data.aws_ami.amazon_linux.id
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
