resource "aws_db_subnet_group" "blackbridge_production_rds_sg" {
  name       = "${var.app_name}-rds-subnet-group"
  subnet_ids = var.private_subnet_ids

  depends_on = [ var.private_subnet_ids ]

  tags = {
    Name        = "${var.app_name} RDS Subnet Group"
    Application = var.app_name
  }
}

resource "aws_db_instance" "blackbridge_production_rds" {
  engine             = "postgres"
  instance_class     = var.rds_instance_type
  allocated_storage  = 20
  storage_type       = "gp2"
  db_subnet_group_name = aws_db_subnet_group.blackbridge_production_rds_sg.name
  skip_final_snapshot = true
  username           = var.rds_username
  password           = var.rds_password
  vpc_security_group_ids = [var.rds_sg_id]

  depends_on = [ var.private_subnet_ids ]

  tags = {
    Name        = "${var.app_name} Postgres RDS"
    Application = var.app_name
  }
}
