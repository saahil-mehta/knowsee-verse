resource "random_password" "db" {
  length  = 32
  special = false
}

resource "google_sql_database_instance" "postgres" {
  name             = "${var.name_prefix}-db"
  database_version = "POSTGRES_17"
  region           = var.region

  deletion_protection = var.db_deletion_protection

  depends_on = [google_service_networking_connection.private_services]

  settings {
    tier              = var.db_tier
    availability_type = "ZONAL"

    ip_configuration {
      # Private IP only: no public endpoint.
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }

    backup_configuration {
      enabled = true
    }
  }
}

resource "google_sql_database" "app" {
  name     = "knowsee"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "app" {
  name     = var.name_prefix
  instance = google_sql_database_instance.postgres.name
  password = random_password.db.result
}

locals {
  # TCP DSN over the private IP (parses cleanly in postgres-js).
  database_url = "postgresql://${google_sql_user.app.name}:${random_password.db.result}@${google_sql_database_instance.postgres.private_ip_address}:5432/${google_sql_database.app.name}"
}
