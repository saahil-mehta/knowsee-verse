resource "google_artifact_registry_repository" "app" {
  repository_id = var.name_prefix
  format        = "DOCKER"
  location      = var.region
  description   = "Knowsee container images"

  depends_on = [google_project_service.required]
}

locals {
  image_repo_uri = "${var.region}-docker.pkg.dev/${var.project_id}/${var.name_prefix}"
}
