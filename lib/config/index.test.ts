import { describe, expect, it } from "vitest";
import { describeConfig, resolveConfig } from "./index";

// A complete, valid environment; individual tests clone and mutate it.
const validEnv = (): NodeJS.ProcessEnv => ({
  NODE_ENV: "production",
  BETTER_AUTH_URL: "http://localhost:3100",
  BETTER_AUTH_SECRET: "secret-value",
  POSTGRES_URL: "postgresql://postgres:postgres@localhost:5432/knowsee",
  VERCEL_AI_GATEWAY: "gw-key",
  MAILGUN_API_KEY: "mg-key",
  MAILGUN_DOMAIN: "data.example.com",
});

describe("resolveConfig", () => {
  it("resolves a valid environment with sensible switch defaults", () => {
    const config = resolveConfig(validEnv());

    expect(config.auth.mode).toBe("otp");
    expect(config.storage.backend).toBe("vercel-blob");
    expect(config.redis.enabled).toBe(false);
    expect(config.db.url).toContain("postgresql://");
    expect(config.env.isProduction).toBe(true);
    expect(config.auth.google).toBeNull();
  });

  it("throws listing every missing required value", () => {
    const env = validEnv();
    env.POSTGRES_URL = undefined;
    env.MAILGUN_API_KEY = "   "; // whitespace counts as missing

    expect(() => resolveConfig(env)).toThrowError(/POSTGRES_URL/);
    try {
      resolveConfig(env);
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("POSTGRES_URL");
      expect(message).toContain("MAILGUN_API_KEY");
    }
  });

  it("requires a Google client only in sso mode", () => {
    const otp = resolveConfig({ ...validEnv(), AUTH_MODE: "otp" });
    expect(otp.auth.google).toBeNull();

    expect(() =>
      resolveConfig({ ...validEnv(), AUTH_MODE: "sso" })
    ).toThrowError(/GOOGLE_CLIENT_ID/);

    const sso = resolveConfig({
      ...validEnv(),
      AUTH_MODE: "sso",
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_CLIENT_SECRET: "client-secret",
    });
    expect(sso.auth.google).toEqual({
      clientId: "client-id",
      clientSecret: "client-secret",
    });
  });

  it("rejects an invalid switch value loudly", () => {
    expect(() =>
      resolveConfig({ ...validEnv(), AUTH_MODE: "magic-link" })
    ).toThrowError(/AUTH_MODE/);
  });

  it("treats Redis as off without a URL and on with one", () => {
    expect(resolveConfig(validEnv()).redis.enabled).toBe(false);

    const withUrl = resolveConfig({
      ...validEnv(),
      REDIS_URL: "redis://localhost:6379",
    });
    expect(withUrl.redis.enabled).toBe(true);
    expect(withUrl.redis.url).toBe("redis://localhost:6379");
  });

  it("fails loudly when Redis is enabled without a URL", () => {
    expect(() =>
      resolveConfig({ ...validEnv(), REDIS_ENABLED: "true" })
    ).toThrowError(/REDIS_URL/);
  });

  it("requires a bucket when storage is gcs", () => {
    expect(() =>
      resolveConfig({ ...validEnv(), STORAGE_BACKEND: "gcs" })
    ).toThrowError(/GCS_BUCKET/);

    const gcs = resolveConfig({
      ...validEnv(),
      STORAGE_BACKEND: "gcs",
      GCS_BUCKET: "knowsee-uploads",
    });
    expect(gcs.storage.gcsBucket).toBe("knowsee-uploads");
  });

  it("detects the test environment from Playwright markers", () => {
    expect(
      resolveConfig({ ...validEnv(), PLAYWRIGHT: "True" }).env.isTest
    ).toBe(true);
  });
});

describe("describeConfig", () => {
  it("summarises the resolved switches", () => {
    const summary = describeConfig(resolveConfig(validEnv()));
    expect(summary).toContain("authMode=otp");
    expect(summary).toContain("redis=off");
  });
});
