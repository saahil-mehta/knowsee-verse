output "cloud_run_url" {
  value       = google_cloud_run_v2_service.app.uri
  description = "Public URL of the Cloud Run service."
}

output "image_repo_uri" {
  value       = local.image_repo_uri
  description = "Artifact Registry repo to push images to."
}

output "runtime_service_account" {
  value       = google_service_account.run.email
  description = "Cloud Run runtime service account email."
}

output "cloud_sql_instance" {
  value       = google_sql_database_instance.postgres.name
  description = "Cloud SQL instance name (private IP)."
}

output "uploads_bucket" {
  value       = google_storage_bucket.uploads.name
  description = "GCS uploads bucket."
}

output "database_url_secret" {
  value       = google_secret_manager_secret.database_url.secret_id
  description = "Secret id holding the constructed DATABASE_URL (run migrations from a context that can read it and reach the private IP)."
}
