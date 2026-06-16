import { config } from "dotenv";

config({
  path: ".env.local",
});

import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { account, user } from "./schema";

// Seeds the e2e test user (read from TEST_USER_EMAIL / TEST_USER_PASSWORD) so
// the Playwright auth.setup login succeeds. Reproducible and database-agnostic:
// runs against whatever POSTGRES_URL points at (local Postgres in dev, the CI
// database in CI). The password is hashed with Better Auth's own hasher so the
// normal email/password sign-in verifies it; emailVerified is set true so the
// verification gate lets the user hold a session. Idempotent.
const runSeed = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  if (!(email && password)) {
    throw new Error(
      "TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in .env.local"
    );
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);

  try {
    const existing = await db.select().from(user).where(eq(user.email, email));

    if (existing.length > 0) {
      await db
        .update(user)
        .set({ emailVerified: true })
        .where(eq(user.email, email));
      console.log("✅ Test user already present; ensured emailVerified");
      return;
    }

    const userId = crypto.randomUUID();
    const hashed = await hashPassword(password);

    await db.insert(user).values({
      id: userId,
      name: "Test User",
      email,
      emailVerified: true,
    });
    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashed,
    });

    console.log("✅ Seeded test user %s", email);
  } finally {
    await connection.end();
  }
};

runSeed().catch((error) => {
  console.error("❌ Seed failed");
  console.error(error);
  process.exit(1);
});
