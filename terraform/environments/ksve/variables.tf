variable "project_id" {
  type        = string
  description = "GCP project id for the Knowsee deployment."
}

variable "region" {
  type        = string
  default     = "europe-west1"
  description = "GCP region for all regional resources."
}

variable "name_prefix" {
  type        = string
  default     = "ksve"
  description = "Prefix for every resource name, so the stack is findable and removable."
}

variable "app_url" {
  type        = string
  description = "Public URL of the deployed app (sets BETTER_AUTH_URL / trusted origin)."
}

variable "auth_mode" {
  type        = string
  default     = "otp"
  description = "Authentication mode: otp (email OTP) or sso (Google OAuth)."
  validation {
    condition     = contains(["otp", "sso"], var.auth_mode)
    error_message = "auth_mode must be \"otp\" or \"sso\"."
  }
}

variable "cloud_run_image" {
  type        = string
  default     = "gcr.io/cloudrun/hello"
  description = "Container image. Placeholder until the first real image is pushed; the image is then managed out-of-band by gcloud run deploy / docker push (lifecycle ignores it)."
}

variable "cloud_run_min_instances" {
  type    = number
  default = 0
}

variable "cloud_run_max_instances" {
  type    = number
  default = 10
}

variable "cloud_run_cpu" {
  type    = string
  default = "1"
}

variable "cloud_run_memory" {
  type    = string
  default = "1Gi"
}

variable "db_tier" {
  type        = string
  default     = "db-custom-1-3840"
  description = "Cloud SQL machine tier."
}

variable "db_deletion_protection" {
  type    = bool
  default = false
}

variable "redis_memory_size_gb" {
  type    = number
  default = 1
}

# Secret values, supplied via a gitignored terraform.tfvars (never committed).
# Required at apply time; not needed for terraform validate.
variable "llm_gateway_api_key" {
  type        = string
  sensitive   = true
  default     = null
  description = "Vercel AI Gateway API key (the one non-GCP dependency)."
}

variable "mailgun_api_key" {
  type      = string
  sensitive = true
  default   = null
}

variable "mailgun_domain" {
  type    = string
  default = null
}

variable "mailgun_from" {
  type    = string
  default = null
}

variable "google_oauth_client_id" {
  type        = string
  default     = null
  description = "Google OAuth client id (sso mode only; Knowsee/Publicis, never South Pole)."
}

variable "google_oauth_client_secret" {
  type      = string
  sensitive = true
  default   = null
}

variable "labels" {
  type = map(string)
  default = {
    app         = "knowsee"
    managed_by  = "terraform"
    environment = "pilot"
  }
}
