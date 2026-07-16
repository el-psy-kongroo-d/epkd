export enum ErrorCode {
  POST_NOT_FOUND = "POST_NOT_FOUND",
  POST_ALREADY_EXISTS = "POST_ALREADY_EXISTS",
  COMMENT_NOT_FOUND = "COMMENT_NOT_FOUND",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  VALIDATION_FAILED = "VALIDATION_FAILED",
  UNAUTHORIZED = "UNAUTHORIZED",
  RATE_LIMITED = "RATE_LIMITED",
  INTERNAL = "INTERNAL",
}

export interface ApiSuccess<T> { data: T }
export interface ApiError { error: { code: ErrorCode; message: string } }
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export const ok = <T>(data: T): ApiSuccess<T> => ({ data });
export const err = (code: ErrorCode, message: string): ApiError => ({ error: { code, message } });
