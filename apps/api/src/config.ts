import { z } from "zod";

export const DEFAULT_PORT = 3000;
export const DEFAULT_HOST = "127.0.0.1";

export const JSON_BODY_LIMIT = "300kb";

export const GLOBAL_RATE_LIMIT = { windowMs: 60_000, limit: 300 };
export const PUBLISH_RATE_LIMIT = { windowMs: 60_000, limit: 10 };
export const COMMENT_RATE_LIMIT = { windowMs: 60_000, limit: 5 };
export const COUNTER_RATE_LIMIT = { windowMs: 60_000, limit: 60 };

export const BCRYPT_COST = 10;

export const HONEYPOT_DELAY_MS = { min: 100, max: 300 };

const EnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  PUBLISH_TOKEN: z.string().min(16),
  PORT: z.coerce.number().int().positive().optional(),
  HOST: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),
  BASE_URL: z.string().url().default("http://localhost:5173"),
  TRUST_PROXY: z.string().optional(),
  WEB_DIST: z.string().optional(),
  NODE_ENV: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(
  env: Record<string, string | undefined>,
): { ok: true; value: Env } | { ok: false; issues: string[] } {
  const result = EnvSchema.safeParse(env);
  if (result.success) return { ok: true, value: result.data };
  return { ok: false, issues: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
}

export function parseEnv(): Env {
  const result = validateEnv(process.env);
  if (!result.ok) {
    for (const issue of result.issues) console.error(`env: ${issue}`);
    process.exit(1);
  }
  return result.value;
}
