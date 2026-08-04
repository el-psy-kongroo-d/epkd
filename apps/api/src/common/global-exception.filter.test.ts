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
  it("AppException → its status and code envelope", () => {
    const { res, host } = mockHost();
    new GlobalExceptionFilter().catch(new AppException(ErrorCode.POST_NOT_FOUND, 404, "no entry"), host);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: { code: "POST_NOT_FOUND", message: "no entry" } });
  });

  it("unknown exception → 500 INTERNAL, internal message not exposed", () => {
    const { res, host } = mockHost();
    new GlobalExceptionFilter().catch(new Error("secret /Users/x stack"), host);
    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe("INTERNAL");
    expect(body.error.message).not.toContain("secret");
  });

  it("responds 413, not 500, to body-parser 4xx errors (PayloadTooLarge)", () => {
    const { res, host } = mockHost();
    const tooLarge = Object.assign(new Error("request entity too large"), { status: 413, type: "entity.too.large" });
    new GlobalExceptionFilter().catch(tooLarge, host);
    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: ErrorCode.PAYLOAD_TOO_LARGE, message: "invalid request" },
    });
  });

  it("treats 4xx errors carrying only statusCode as client errors", () => {
    const { res, host } = mockHost();
    new GlobalExceptionFilter().catch(Object.assign(new Error("bad"), { statusCode: 400 }), host);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error.code).toBe(ErrorCode.VALIDATION_FAILED);
  });

  it("errors with a 5xx status fall through to 500 INTERNAL", () => {
    const { res, host } = mockHost();
    new GlobalExceptionFilter().catch(Object.assign(new Error("upstream"), { status: 502 }), host);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].error.code).toBe(ErrorCode.INTERNAL);
  });
});
