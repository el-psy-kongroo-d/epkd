import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from "@nestjs/common";
import { ErrorCode, err } from "@epkd/shared";
import * as Sentry from "@sentry/nestjs";
import type { Response } from "express";
import { AppException } from "./app.exception";

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  400: ErrorCode.VALIDATION_FAILED,
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  413: ErrorCode.PAYLOAD_TOO_LARGE,
  429: ErrorCode.RATE_LIMITED,
};

function clientStatus(exception: unknown): number | null {
  const status = (exception as { status?: unknown; statusCode?: unknown })?.status;
  const code = typeof status === "number" ? status : (exception as { statusCode?: unknown }).statusCode;
  return typeof code === "number" && code >= 400 && code < 500 ? code : null;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("Exception");

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof AppException) {
      res.status(exception.status).json(err(exception.code, exception.message));
      return;
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = STATUS_TO_CODE[status] ?? ErrorCode.INTERNAL;
      res.status(status).json(err(code, code === ErrorCode.INTERNAL ? "internal error" : exception.message));
      return;
    }
    const status = clientStatus(exception);
    if (status !== null) {
      const code = STATUS_TO_CODE[status] ?? ErrorCode.VALIDATION_FAILED;
      res.status(status).json(err(code, "invalid request"));
      return;
    }

    this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    Sentry.captureException(exception);
    res.status(500).json(err(ErrorCode.INTERNAL, "internal error"));
  }
}
