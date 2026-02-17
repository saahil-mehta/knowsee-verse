# ─── Variables ───
LOCAL_DATABASE_URL := postgresql://knowsee:localdev@localhost:5433/knowsee_verse

# ─── Development ───
.PHONY: dev install

install:
	pnpm install

dev: db-up db-migrate
	pnpm dev

# ─── Database ───
.PHONY: db-up db-down db-migrate db-reset

db-up:
	@docker compose -f docker-compose.local.yml up -d
	@echo "Waiting for PostgreSQL..."
	@until docker exec knowsee-verse-postgres pg_isready -U knowsee -d knowsee_verse > /dev/null 2>&1; do sleep 1; done
	@echo "PostgreSQL ready."

db-down:
	@docker compose -f docker-compose.local.yml down

db-migrate:
	@POSTGRES_URL=$(LOCAL_DATABASE_URL) pnpm db:migrate

db-reset:
	@docker exec knowsee-verse-postgres psql -U knowsee -d knowsee_verse -c "DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	@$(MAKE) db-migrate
