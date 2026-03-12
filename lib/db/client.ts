import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Single shared connection pool for the entire app.
// Avoids multiple postgres() instances competing for Supavisor connections.
// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!, { max: 10 });

export const db = drizzle(client);
