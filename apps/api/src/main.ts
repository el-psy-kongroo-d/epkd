import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/global-exception.filter";
import { createRateLimiter } from "./common/rate-limit";
import { ResponseInterceptor } from "./common/response.interceptor";
import { DEFAULT_PORT, GLOBAL_RATE_LIMIT, JSON_BODY_LIMIT } from "./config";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.useBodyParser("json", { limit: JSON_BODY_LIMIT });
  app.getHttpAdapter().getInstance().disable("x-powered-by");
  app.use(helmet());
  app.enableCors({ origin: (process.env.CORS_ORIGINS ?? "").split(",").filter(Boolean) });
  app.use(createRateLimiter({ ...GLOBAL_RATE_LIMIT, message: "too many requests" }));

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  await app.listen(Number(process.env.PORT ?? DEFAULT_PORT));
}
void bootstrap();
