import { z } from "zod";

/**
 * Single typed configuration module (spec section 5).
 *
 * Configuration is the saviour; there are no silent fallbacks. Every value is
 * resolved once, validated, and either present or a loud failure. Optional
 * capabilities sit behind explicit switches whose resolved values are logged
 * at startup, and a missing or invalid *required* value throws with a clear
 * message rather than degrading silently.
 *
 * `resolveConfig` is a pure function of an environment object so it can be unit
 * tested against synthetic envs. `getConfig` memoises the resolution against
 * `process.env` for the running app and is lazy, so importing this module never
 * throws at build time or in unrelated tests.
 */

const authModeSchema = z.enum(["sso", "otp"]);
const storageBackendSchema = z.enum(["gcs", "vercel-blob", "local"]);

export type AuthMode = z.infer<typeof authModeSchema>;
export type StorageBackend = z.infer<typeof storageBackendSchema>;

export type Config = {
  env: {
    nodeEnv: string;
    isProduction: boolean;
    isDevelopment: boolean;
    isTest: boolean;
  };
  gcp: {
    projectId: string | null;
    region: string | null;
  };
  auth: {
    mode: AuthMode;
    url: string;
    secret: string;
    google: { clientId: string; clientSecret: string } | null;
  };
  db: {
    url: string;
  };
  redis: {
    enabled: boolean;
    url: string | null;
  };
  storage: {
    backend: StorageBackend;
    gcsBucket: string | null;
    vercelBlobToken: string | null;
  };
  llm: {
    gatewayApiKey: string;
  };
  email: {
    mailgunApiKey: string;
    mailgunDomain: string;
    mailgunFrom: string | null;
  };
  export: {
    puppeteerExecutablePath: string | null;
  };
};

const isTruthy = (value: string | undefined): boolean =>
  value === "true" || value === "1";

/**
 * Resolve and validate configuration from a raw environment object.
 * Throws a single aggregated error listing every problem when required values
 * are missing or switches hold invalid values.
 */
export function resolveConfig(env: NodeJS.ProcessEnv): Config {
  const problems: string[] = [];

  const require_ = (key: string): string => {
    const value = env[key]?.trim();
    if (!value) {
      problems.push(`${key} is required but missing or empty`);
      return "";
    }
    return value;
  };

  const parseEnum = <T extends string>(
    key: string,
    schema: z.ZodEnum<Record<string, T>> | z.ZodType<T>,
    fallback: T
  ): T => {
    const raw = env[key]?.trim();
    if (!raw) {
      return fallback;
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      problems.push(
        `${key}="${raw}" is not a valid value (allowed: see config schema)`
      );
      return fallback;
    }
    return parsed.data;
  };

  const nodeEnv = env.NODE_ENV ?? "development";
  const authMode = parseEnum<AuthMode>("AUTH_MODE", authModeSchema, "otp");
  const storageBackend = parseEnum<StorageBackend>(
    "STORAGE_BACKEND",
    storageBackendSchema,
    "vercel-blob"
  );

  // Redis is optional. It is on when a URL is provided or REDIS_ENABLED is set;
  // when off, resumable streams are explicitly disabled (never silently masked).
  const redisUrl = env.REDIS_URL?.trim() || null;
  const redisEnabled = isTruthy(env.REDIS_ENABLED) || Boolean(redisUrl);
  if (redisEnabled && !redisUrl) {
    problems.push("REDIS_ENABLED is set but REDIS_URL is missing");
  }

  // SSO mode requires a (non-South-Pole) Google OAuth client.
  let google: Config["auth"]["google"] = null;
  if (authMode === "sso") {
    const clientId = require_("GOOGLE_CLIENT_ID");
    const clientSecret = require_("GOOGLE_CLIENT_SECRET");
    google = { clientId, clientSecret };
  }

  // GCS-backed storage requires a bucket.
  const gcsBucket = env.GCS_BUCKET?.trim() || null;
  if (storageBackend === "gcs" && !gcsBucket) {
    problems.push('STORAGE_BACKEND="gcs" requires GCS_BUCKET');
  }

  const config: Config = {
    env: {
      nodeEnv,
      isProduction: nodeEnv === "production",
      isDevelopment: nodeEnv === "development",
      isTest: Boolean(
        env.PLAYWRIGHT_TEST_BASE_URL || env.PLAYWRIGHT || env.CI_PLAYWRIGHT
      ),
    },
    gcp: {
      projectId: env.GCP_PROJECT_ID?.trim() || null,
      region: env.GCP_REGION?.trim() || null,
    },
    auth: {
      mode: authMode,
      url: require_("BETTER_AUTH_URL"),
      secret: require_("BETTER_AUTH_SECRET"),
      google,
    },
    db: {
      url: require_("POSTGRES_URL"),
    },
    redis: {
      enabled: redisEnabled,
      url: redisUrl,
    },
    storage: {
      backend: storageBackend,
      gcsBucket,
      vercelBlobToken: env.BLOB_READ_WRITE_TOKEN?.trim() || null,
    },
    llm: {
      gatewayApiKey: require_("VERCEL_AI_GATEWAY"),
    },
    email: {
      mailgunApiKey: require_("MAILGUN_API_KEY"),
      mailgunDomain: require_("MAILGUN_DOMAIN"),
      mailgunFrom: env.MAILGUN_FROM?.trim() || null,
    },
    export: {
      puppeteerExecutablePath: env.PUPPETEER_EXECUTABLE_PATH?.trim() || null,
    },
  };

  if (problems.length > 0) {
    throw new Error(
      `Invalid configuration:\n${problems.map((p) => `  - ${p}`).join("\n")}`
    );
  }

  return config;
}

/** Human-readable summary of the resolved switches, logged once at startup. */
export function describeConfig(config: Config): string {
  return [
    `authMode=${config.auth.mode}`,
    `storage=${config.storage.backend}`,
    `redis=${config.redis.enabled ? "on" : "off"}`,
    `gcpProject=${config.gcp.projectId ?? "unset"}`,
    `nodeEnv=${config.env.nodeEnv}`,
  ].join(" ");
}

let cached: Config | null = null;
let logged = false;

/** Lazily resolve (and memoise) configuration for the running app. */
export function getConfig(): Config {
  if (!cached) {
    cached = resolveConfig(process.env);
    if (!logged) {
      logged = true;
      console.log("[config] resolved %s", describeConfig(cached));
    }
  }
  return cached;
}
