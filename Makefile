# ─── Development ───
.PHONY: dev install

install:
	pnpm install

dev:
	pnpm dev

# ─── Database (Supabase PostgreSQL) ───
.PHONY: db-generate db-migrate db-reset

db-generate:
	pnpm db:generate

db-migrate:
	pnpm db:migrate

db-reset:
	pnpm drizzle-kit push
