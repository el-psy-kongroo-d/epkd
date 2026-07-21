import type { ApiResponse } from "@epkd/shared";
import { ErrorCode } from "@epkd/shared";

export class ApiClientError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

function isEmptyBody(res: Response): boolean {
  return res.status === 204 || res.headers?.get("content-length") === "0";
}

async function unwrap<T>(res: Response): Promise<T> {
  if (isEmptyBody(res)) return undefined as T;

  let body: ApiResponse<T>;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError(ErrorCode.INTERNAL, "invalid response");
  }
  if ("error" in body) throw new ApiClientError(body.error.code, body.error.message);
  return body.data;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path);
  return unwrap<T>(res);
}
