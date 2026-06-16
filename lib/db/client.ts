import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getConfig } from "@/lib/config";

type DrizzleDb = ReturnType<typeof drizzle>;

let instance: DrizzleDb | null = null;

// Single shared connection pool, created lazily on first use. Deferring
// creation keeps `next build`'s page-data collection (which imports this
// module but issues no queries) from resolving config, while a missing or
// invalid POSTGRES_URL still fails loud on the first real query rather than
// connecting to nothing.
function getDb(): DrizzleDb {
  if (!instance) {
    const client = postgres(getConfig().db.url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      max_lifetime: 60 * 5,
    });
    instance = drizzle(client);
  }
  return instance;
}

export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop) {
    const real = getDb();
    const value = real[prop as keyof DrizzleDb];
    return typeof value === "function" ? value.bind(real) : value;
  },
}) as DrizzleDb;
