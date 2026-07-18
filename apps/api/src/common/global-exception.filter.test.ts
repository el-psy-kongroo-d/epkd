import { ErrorCode } from "@epkd/shared";
import { describe, expect, it, vi } from "vitest";
import { AppException } from "./app.exception";
import { GlobalExceptionFilter } from "./global-exception.filter";

function mockHost() {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const host = {
    switchToHttp: () => ({ getResponse: () => res, getRequest: () => ({ url: "/api/x" }) }),
  } as never;
  return { res, host };
}

describe("GlobalExceptionFilter", () => {
  it("AppException → 해당 status와 코드 엔벨로프", () => {
    const { res, host } = mockHost();
    new GlobalExceptionFilter().catch(new AppException(ErrorCode.POST_NOT_FOUND, 404, "no entry"), host);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: { code: "POST_NOT_FOUND", message: "no entry" } });
  });

  it("미지의 예외 → 500 INTERNAL, 내부 메시지 비노출", () => {
    const { res, host } = mockHost();
    new GlobalExceptionFilter().catch(new Error("secret /Users/x stack"), host);
    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe("INTERNAL");
    expect(body.error.message).not.toContain("secret");
  });
});
