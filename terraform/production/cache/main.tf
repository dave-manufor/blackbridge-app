resource "aws_elasticache_subnet_group" "blackbridge_production_redis_sg" {
  name       = "${var.app_name}-elasticache-subnet-group"
  subnet_ids = var.private_subnet_ids

  depends_on = [ var.private_subnet_ids ]

  tags = {
    Name        = "${var.app_name} Elasticache Subnet Group"
    Application = var.app_name
  }
}

resource "aws_elasticache_cluster" "blackbridge_production_redis" {
  cluster_id           = "${var.app_name}-redis-cluster"
  engine               = "redis"
  node_type            = var.elasticache_node_type
  num_cache_nodes      = 1
  engine_version       = "6.x"
  port                 = 6379
  parameter_group_name = "default.redis6.x"
  subnet_group_name    = aws_elasticache_subnet_group.blackbridge_production_redis_sg.name
  security_group_ids   = [var.elasticache_sg_id]

  depends_on = [ var.private_subnet_ids ]

  tags = {
    Name        = "${var.app_name} Redis Cluster"
    Application = var.app_name
  }
}
