# A simple VPC with a public and private subnet

data "aws_availability_zones" "available" {}

resource "aws_vpc" "blackbridge_production_vpc" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name        = "${var.app_name} VPC"
    Application = var.app_name
  }
}

resource "aws_subnet" "public_subnet" {
  vpc_id                  = aws_vpc.blackbridge_production_vpc.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true

  tags = {
    Name        = "${var.app_name} Public Subnet"
    Application = var.app_name
  }
}

resource "aws_subnet" "private_subnet_1" {
  vpc_id     = aws_vpc.blackbridge_production_vpc.id
  cidr_block = "10.0.2.0/24"
  availability_zone = data.aws_availability_zones.available.names[0]

  tags = {
    Name        = "${var.app_name} Private Subnet 1"
    Application = var.app_name
  }
}

resource "aws_subnet" "private_subnet_2" {
  vpc_id     = aws_vpc.blackbridge_production_vpc.id
  cidr_block = "10.0.3.0/24"
  availability_zone = data.aws_availability_zones.available.names[1]

  tags = {
    Name        = "${var.app_name} Private Subnet 2"
    Application = var.app_name
  }
}

resource "aws_internet_gateway" "main_igw" {
  vpc_id = aws_vpc.blackbridge_production_vpc.id
  tags = {
    Name = "${var.app_name}-igw"
  }
}

resource "aws_route_table" "public_route_table" {
  vpc_id = aws_vpc.blackbridge_production_vpc.id
  tags = {
    Name = "${var.app_name}-public-route-table"
  }
}

resource "aws_route" "public_route" {
  route_table_id         = aws_route_table.public_route_table.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main_igw.id
}

resource "aws_route_table_association" "public_subnet_association" {
  subnet_id      = aws_subnet.public_subnet.id
  route_table_id = aws_route_table.public_route_table.id
}

resource "aws_security_group" "blackbridge_production_ec2_sg" {
  name        = "${var.app_name}-ec2-sg"
  description = "Allows SSH and HTTP/S from anywhere and internal traffic"
  vpc_id      = aws_vpc.blackbridge_production_vpc.id

  # Inbound rules
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow SSH access"
  }
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTP access"
  }
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTPS access"
  }
  # Outbound rules
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.app_name} EC2 SG"
    Application = var.app_name
  }
}

resource "aws_security_group" "blackbridge_production_rds_sg" {
  name        = "${var.app_name}-rds-sg"
  description = "Allows Postgres access only from the EC2 instance"
  vpc_id      = aws_vpc.blackbridge_production_vpc.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.blackbridge_production_ec2_sg.id]
    description     = "Allow Postgres traffic from EC2"
  }

  tags = {
    Name        = "${var.app_name} RDS SG"
    Application = var.app_name
  }
}

resource "aws_security_group" "blackbridge_production_elasticache_sg" {
  name        = "${var.app_name}-elasticache-sg"
  description = "Allows Redis access only from the EC2 instance"
  vpc_id      = aws_vpc.blackbridge_production_vpc.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.blackbridge_production_ec2_sg.id]
    description     = "Allow Redis traffic from EC2"
  }

  tags = {
    Name        = "${var.app_name} Elasticache SG"
    Application = var.app_name
  }
}
