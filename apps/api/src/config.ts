export const DEFAULT_PORT = 3000;

export const JSON_BODY_LIMIT = "300kb";

export const GLOBAL_RATE_LIMIT = { windowMs: 60_000, limit: 300 };
export const PUBLISH_RATE_LIMIT = { windowMs: 60_000, limit: 10 };
export const COMMENT_RATE_LIMIT = { windowMs: 60_000, limit: 5 };

export const BCRYPT_COST = 10;

export const HONEYPOT_DELAY_MS = { min: 100, max: 300 };
