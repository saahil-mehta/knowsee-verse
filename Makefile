# Knowsee operational targets. Composable, DRY. Mirrors Orca's Makefile shape,
# adapted to the GCP-native stack: local Docker Postgres for dev, the single
# `ksve` Terraform environment, and a Dockerfile-based Cloud Run deploy.
#
# Deploy/Terraform targets need PROJECT (your GCP project id), e.g.
#   make deploy PROJECT=my-knowsee-project

TF_DIR  := terraform/environments/ksve
TF      := terraform -chdir=$(TF_DIR)
REGION  ?= europe-west1
SERVICE ?= ksve-app
AR_REPO := ksve
IMAGE    = $(REGION)-docker.pkg.dev/$(PROJECT)/$(AR_REPO)/app:latest

.DEFAULT_GOAL := help

.PHONY: help
help:
	@echo "Knowsee make targets"
	@echo ""
	@echo "Setup / App"
	@echo "  install        pnpm install"
	@echo "  dev            pnpm dev (http://localhost:3100)"
	@echo "  build          pnpm build"
	@echo "  start          pnpm start"
	@echo ""
	@echo "Database (local Docker Postgres)"
	@echo "  db-up          docker compose up -d (Postgres)"
	@echo "  db-down        docker compose down"
	@echo "  db-generate    drizzle-kit generate"
	@echo "  db-migrate     apply migrations to POSTGRES_URL"
	@echo "  db-seed        seed the e2e test user"
	@echo ""
	@echo "Quality"
	@echo "  lint           pnpm lint"
	@echo "  format         pnpm format"
	@echo "  typecheck      tsc --noEmit"
	@echo "  test-unit      vitest unit tests"
	@echo "  test-e2e       playwright e2e tests"
	@echo "  test           test-unit + test-e2e"
	@echo "  check          lint + typecheck + test-unit"
	@echo ""
	@echo "Terraform (terraform/environments/ksve)"
	@echo "  tf-init        init backend + providers"
	@echo "  tf-validate    validate"
	@echo "  tf-plan        plan (PROJECT=... via tfvars)"
	@echo "  tf-apply       apply"
	@echo "  tf-output      all outputs (KEY=foo for one raw value)"
	@echo "  tf-destroy     destroy the stack"
	@echo ""
	@echo "Deploy (needs PROJECT=...)"
	@echo "  build-image    gcloud builds submit (Dockerfile -> Artifact Registry)"
	@echo "  deploy         build-image + gcloud run deploy $(SERVICE)"
	@echo "  db-url         print the deployed DATABASE_URL secret value"

# -----------------------------------------------------------------------------
# Setup / App
# -----------------------------------------------------------------------------

.PHONY: install dev build start
install:
	pnpm install

dev:
	pnpm dev

build:
	pnpm build

start:
	pnpm start

# -----------------------------------------------------------------------------
# Database (local Docker Postgres; see compose.yaml)
# -----------------------------------------------------------------------------

.PHONY: db-up db-down db-generate db-migrate db-seed
db-up:
	docker compose up -d

db-down:
	docker compose down

db-generate:
	pnpm db:generate

db-migrate:
	pnpm db:migrate

db-seed:
	pnpm db:seed

# -----------------------------------------------------------------------------
# Quality
# -----------------------------------------------------------------------------

.PHONY: lint format typecheck test-unit test-e2e test check
lint:
	pnpm lint

format:
	pnpm format

typecheck:
	pnpm exec tsc --noEmit

test-unit:
	pnpm test:unit

test-e2e:
	pnpm test

test: test-unit test-e2e

check: lint typecheck test-unit

# -----------------------------------------------------------------------------
# Terraform
# -----------------------------------------------------------------------------

.PHONY: tf-init tf-validate tf-plan tf-apply tf-output tf-destroy
tf-init:
	$(TF) init

tf-validate:
	$(TF) validate

tf-plan:
	$(TF) plan -parallelism=72

tf-apply:
	$(TF) apply -parallelism=72

tf-output:
ifdef KEY
	@$(TF) output -raw $(KEY)
else
	@$(TF) output
endif

tf-destroy:
	$(TF) destroy

# -----------------------------------------------------------------------------
# Deploy (Dockerfile -> Artifact Registry -> Cloud Run). Needs PROJECT=...
# -----------------------------------------------------------------------------
# Cloud SQL is private-IP only, so migrations do not run from here; apply them
# from a context with VPC access (a one-off Cloud Run job) using db-url.

.PHONY: _require-project build-image deploy db-url
_require-project:
	@test -n "$(PROJECT)" || (echo "set PROJECT=<gcp-project-id>" && exit 1)

build-image: _require-project
	gcloud builds submit \
	  --tag=$(IMAGE) \
	  --region=$(REGION) \
	  --project=$(PROJECT)

deploy: _require-project build-image
	gcloud run deploy $(SERVICE) \
	  --image=$(IMAGE) \
	  --region=$(REGION) \
	  --project=$(PROJECT)

db-url: _require-project
	@gcloud secrets versions access latest --secret=ksve-database-url --project=$(PROJECT)
