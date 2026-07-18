import { createHash, timingSafeEqual } from "node:crypto";

const sha256 = (s: string): Buffer => createHash("sha256").update(s).digest();

export function isValidBearerToken(header: string | undefined, expected: string | undefined): boolean {
  if (!expected) return false;
  return timingSafeEqual(sha256(header ?? ""), sha256(`Bearer ${expected}`));
}
