resource "google_cloud_run_v2_service" "app" {
  name     = "${var.name_prefix}-app"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.run.email

    scaling {
      min_instance_count = var.cloud_run_min_instances
      max_instance_count = var.cloud_run_max_instances
    }

    # Direct VPC egress to reach Cloud SQL and Memorystore on private IP.
    vpc_access {
      network_interfaces {
        network    = google_compute_network.vpc.id
        subnetwork = google_compute_subnetwork.subnet.id
      }
      egress = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = var.cloud_run_image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = var.cloud_run_cpu
          memory = var.cloud_run_memory
        }
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "AUTH_MODE"
        value = var.auth_mode
      }
      env {
        name  = "STORAGE_BACKEND"
        value = "gcs"
      }
      env {
        name  = "GCS_BUCKET"
        value = google_storage_bucket.uploads.name
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "GCP_REGION"
        value = var.region
      }
      env {
        name  = "BETTER_AUTH_URL"
        value = var.app_url
      }
      env {
        name  = "PUPPETEER_EXECUTABLE_PATH"
        value = "/usr/bin/chromium"
      }

      dynamic "env" {
        for_each = var.mailgun_domain == null ? [] : [var.mailgun_domain]
        content {
          name  = "MAILGUN_DOMAIN"
          value = env.value
        }
      }
      dynamic "env" {
        for_each = var.mailgun_from == null ? [] : [var.mailgun_from]
        content {
          name  = "MAILGUN_FROM"
          value = env.value
        }
      }
      dynamic "env" {
        for_each = var.auth_mode == "sso" && var.google_oauth_client_id != null ? [var.google_oauth_client_id] : []
        content {
          name  = "GOOGLE_CLIENT_ID"
          value = env.value
        }
      }

      env {
        name = "POSTGRES_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "REDIS_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.redis_url.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "BETTER_AUTH_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.better_auth_secret.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "VERCEL_AI_GATEWAY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.llm_gateway.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "MAILGUN_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.mailgun_api_key.secret_id
            version = "latest"
          }
        }
      }

      dynamic "env" {
        for_each = var.auth_mode == "sso" ? ["GOOGLE_CLIENT_SECRET"] : []
        content {
          name = env.value
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.oauth_client_secret.secret_id
              version = "latest"
            }
          }
        }
      }
    }
  }

  # The image is managed out-of-band after the first deploy (docker push /
  # gcloud run deploy), so Terraform should not revert it.
  lifecycle {
    ignore_changes = [template[0].containers[0].image, client, client_version]
  }

  depends_on = [
    google_project_iam_member.run_secret_accessor,
    google_secret_manager_secret_version.database_url,
    google_secret_manager_secret_version.redis_url,
  ]
}

# Public ingress; the app's own auth (proxy.ts) is the perimeter.
resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  name     = google_cloud_run_v2_service.app.name
  location = google_cloud_run_v2_service.app.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
