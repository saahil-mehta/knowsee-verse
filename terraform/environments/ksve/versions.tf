terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.0.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.0.0"
    }
  }

  # State in a versioned GCS bucket. Create it once out-of-band:
  #   gsutil mb -p <project> -l <region> gs://ksve-tfstate
  #   gsutil versioning set on gs://ksve-tfstate
  backend "gcs" {
    bucket = "ksve-tfstate"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
