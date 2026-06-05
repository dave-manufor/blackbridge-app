resource "aws_db_subnet_group" "db-sg-dev" {
  name       = "blackbridge-db-subnet-group-dev"
  subnet_ids = module.vpc.private_subnets
  tags       = merge(local.application_tag,{
    Name        = "RDS Subnet Group - dev"
    Environment = "dev"
  })
}

resource "aws_db_instance" "dev" {
  identifier              = "blackbridge-db-dev"
  db_name                 = "blackbridge_dev"
  allocated_storage       = 10
  engine                  = "postgres"
  instance_class          = "db.t3.micro"
  username                = var.db_username
  password                = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.db-sg-dev.name
  vpc_security_group_ids  = [aws_security_group.rds_sg.id]
  publicly_accessible     = false
  skip_final_snapshot     = true
  tags = merge(local.application_tag,{
    Name        = "RDS Instance - dev"
    Environment = "dev"
  })
}
