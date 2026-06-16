# Memorystore for resumable streams. Private service access (same peering as
# Cloud SQL). When this is absent, the app explicitly disables resumable
# streams and logs it (no silent fallback) — so Redis is genuinely optional.
resource "google_redis_instance" "cache" {
  name           = "${var.name_prefix}-redis"
  tier           = "BASIC"
  memory_size_gb = var.redis_memory_size_gb
  region         = var.region

  authorized_network      = google_compute_network.vpc.id
  connect_mode            = "PRIVATE_SERVICE_ACCESS"
  redis_version           = "REDIS_7_2"
  transit_encryption_mode = "DISABLED"

  depends_on = [google_service_networking_connection.private_services]
}

locals {
  redis_url = "redis://${google_redis_instance.cache.host}:${google_redis_instance.cache.port}"
}
