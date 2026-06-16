# Least-privilege runtime service account for Cloud Run.
resource "google_service_account" "run" {
  account_id   = "${var.name_prefix}-run"
  display_name = "Knowsee Cloud Run runtime"
}

# Read the app's secrets.
resource "google_project_iam_member" "run_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.run.email}"
}

# Read/write uploaded objects (scoped to the uploads bucket).
resource "google_storage_bucket_iam_member" "run_uploads" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.run.email}"
}

# BigQuery public-dataset reads for the (later) connector module: jobs run as
# the runtime SA against public data, so it needs to run jobs and read data.
resource "google_project_iam_member" "run_bq_job_user" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.run.email}"
}

resource "google_project_iam_member" "run_bq_data_viewer" {
  project = var.project_id
  role    = "roles/bigquery.dataViewer"
  member  = "serviceAccount:${google_service_account.run.email}"
}
