# Secret Manager. The DB and Redis URLs are constructed from provisioned
# resources; the external secrets (LLM gateway, Mailgun, OAuth) are supplied
# via a gitignored terraform.tfvars and their versions are created only when a
# value is provided, so validate/plan work without secret material present.

resource "google_secret_manager_secret" "database_url" {
  secret_id = "${var.name_prefix}-database-url"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = local.database_url
}

resource "google_secret_manager_secret" "redis_url" {
  secret_id = "${var.name_prefix}-redis-url"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "redis_url" {
  secret      = google_secret_manager_secret.redis_url.id
  secret_data = local.redis_url
}

resource "google_secret_manager_secret" "llm_gateway" {
  secret_id = "${var.name_prefix}-llm-gateway-key"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "llm_gateway" {
  count       = var.llm_gateway_api_key == null ? 0 : 1
  secret      = google_secret_manager_secret.llm_gateway.id
  secret_data = var.llm_gateway_api_key
}

resource "google_secret_manager_secret" "mailgun_api_key" {
  secret_id = "${var.name_prefix}-mailgun-api-key"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "mailgun_api_key" {
  count       = var.mailgun_api_key == null ? 0 : 1
  secret      = google_secret_manager_secret.mailgun_api_key.id
  secret_data = var.mailgun_api_key
}

resource "google_secret_manager_secret" "better_auth_secret" {
  secret_id = "${var.name_prefix}-better-auth-secret"
  replication {
    auto {}
  }
}

resource "random_password" "better_auth" {
  length  = 48
  special = false
}

resource "google_secret_manager_secret_version" "better_auth_secret" {
  secret      = google_secret_manager_secret.better_auth_secret.id
  secret_data = random_password.better_auth.result
}

# OAuth client secret (sso mode only).
resource "google_secret_manager_secret" "oauth_client_secret" {
  secret_id = "${var.name_prefix}-google-oauth-client-secret"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "oauth_client_secret" {
  count       = var.google_oauth_client_secret == null ? 0 : 1
  secret      = google_secret_manager_secret.oauth_client_secret.id
  secret_data = var.google_oauth_client_secret
}
