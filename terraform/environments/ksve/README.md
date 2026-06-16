# ksve Terraform harness

Provisions the Knowsee GCP stack on Cloud Run. Every resource is prefixed
`ksve-` so the stack is findable and removable.

**What it provisions:** a VPC with private services access, Cloud SQL Postgres
(private IP), Memorystore Redis (private), a GCS uploads bucket, Secret Manager
secrets, Artifact Registry, a least-privilege runtime service account, and the
Cloud Run service (direct VPC egress to reach the private DB/Redis).

## Connectivity

The DB is reached over **private IP / TCP** (not the Cloud SQL Unix socket),
so the constructed `DATABASE_URL` parses cleanly in postgres-js. Cloud Run
reaches the private DB and Redis via direct VPC egress.

## Usage

```sh
cp terraform.tfvars.example terraform.tfvars   # fill in secrets (gitignored)
gsutil mb -l <region> gs://ksve-tfstate && gsutil versioning set on gs://ksve-tfstate
terraform init
terraform validate
terraform plan -parallelism=72
terraform apply -parallelism=72                # see deploy note below
```

Then build and push the image, deploy, and migrate:

```sh
gcloud builds submit --tag <region>-docker.pkg.dev/<project>/ksve/app:latest
gcloud run deploy ksve-app --image <...>/ksve/app:latest --region <region>
# migrations run as a separate step against the private DB (e.g. a one-off
# Cloud Run job, or pnpm db:migrate from a context with private-IP access):
POSTGRES_URL="$(gcloud secrets versions access latest --secret ksve-database-url)" pnpm db:migrate
```

## Deploy note

CI deploy via GitHub WIF is blocked by org policy on the shared project, so
`apply` is run manually (ADC-authed) and deploys use `gcloud`. Validate first
on a disposable dev project, exercise, then **defer the real apply to Saahil**,
and `terraform destroy` the dev stack afterwards so nothing is stranded.
