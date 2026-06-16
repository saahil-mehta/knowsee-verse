# Uploads bucket (GCS storage backend). Uniform access; public read on the
# uploads/ prefix is granted below so the app's public object URLs resolve.
resource "google_storage_bucket" "uploads" {
  name                        = "${var.project_id}-${var.name_prefix}-uploads"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = true
  labels                      = var.labels

  cors {
    origin          = [var.app_url]
    method          = ["GET", "HEAD"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

# Public read for uploaded objects (matches the app's public-URL behaviour).
# Tighten to signed URLs in the app if the bucket must stay private.
resource "google_storage_bucket_iam_member" "uploads_public_read" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}
