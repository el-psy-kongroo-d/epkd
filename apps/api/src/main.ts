import "dotenv/config";
import "./instrument";
import "reflect-metadata";
import { existsSync } from "node:fs";
import path from "node:path";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/global-exception.filter";
import { createRateLimiter } from "./common/rate-limit";
import { ResponseInterceptor } from "./common/response.interceptor";
import { DEFAULT_HOST, DEFAULT_PORT, GLOBAL_RATE_LIMIT, JSON_BODY_LIMIT, parseEnv } from "./config";
import { resolveWebDistIndex } from "./pages/web-dist";

async function bootstrap(): Promise<void> {
  parseEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.useBodyParser("json", { limit: JSON_BODY_LIMIT });
  const express = app.getHttpAdapter().getInstance();
  express.disable("x-powered-by");
  if (process.env.TRUST_PROXY) express.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "script-src": ["'self'", "https://www.googletagmanager.com"],
          "connect-src": [
            "'self'",
            "https://*.google-analytics.com",
            "https://*.analytics.google.com",
            "https://*.googletagmanager.com",
            "https://*.ingest.sentry.io",
            "https://*.ingest.us.sentry.io",
          ],
          "img-src": ["'self'", "data:", "https://*.google-analytics.com", "https://*.googletagmanager.com"],
        },
      },
    }),
  );
  app.enableCors({ origin: (process.env.CORS_ORIGINS ?? "").split(",").filter(Boolean) });
  app.use(createRateLimiter({ ...GLOBAL_RATE_LIMIT, message: "too many requests" }));

  const webDistDir = path.dirname(resolveWebDistIndex());
  if (existsSync(webDistDir)) app.useStaticAssets(webDistDir, { index: false });

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? DEFAULT_PORT), process.env.HOST ?? DEFAULT_HOST);
}
void bootstrap();
