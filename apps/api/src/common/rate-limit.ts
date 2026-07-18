import { ErrorCode, err } from "@epkd/shared";
import rateLimit from "express-rate-limit";

export interface RateLimitOptions {
  windowMs: number;
  limit: number;
  message: string;
}

export function createRateLimiter({ windowMs, limit, message }: RateLimitOptions): ReturnType<typeof rateLimit> {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json(err(ErrorCode.RATE_LIMITED, message)),
  });
}
