output "redis_endpoint" {
  description = "The primary endpoint for the Redis ElastiCache cluster."
  value       = aws_elasticache_cluster.blackbridge_production_redis.cache_nodes[0].address
  
}