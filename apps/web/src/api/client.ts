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

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; data: unknown }>();

function isCacheable(path: string): boolean {
  return path === "/api/posts" || /^\/api\/posts\/[^/]+$/.test(path);
}

export function invalidate(path?: string): void {
  if (path === undefined) {
    cache.clear();
    return;
  }
  cache.delete(path);
}

export async function apiGet<T>(path: string, opts?: { revalidate?: boolean }): Promise<T> {
  const cacheable = isCacheable(path);
  if (cacheable && !opts?.revalidate) {
    const hit = cache.get(path);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data as T;
  }
  const res = await fetch(path);
  const data = await unwrap<T>(res);
  if (cacheable) cache.set(path, { at: Date.now(), data });
  return data;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return unwrap<T>(res);
}

export async function apiDelete<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return unwrap<T>(res);
}
