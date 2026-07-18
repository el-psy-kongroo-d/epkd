import { ErrorCode } from "@epkd/shared";

export class AppException extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AppException";
  }
}
