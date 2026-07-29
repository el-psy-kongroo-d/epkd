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

  it("body-parser의 4xx 에러(PayloadTooLarge)는 500이 아니라 413으로 응답한다", () => {
    const { res, host } = mockHost();
    const tooLarge = Object.assign(new Error("request entity too large"), { status: 413, type: "entity.too.large" });
    new GlobalExceptionFilter().catch(tooLarge, host);
    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: ErrorCode.PAYLOAD_TOO_LARGE, message: "invalid request" },
    });
  });

  it("statusCode만 있는 4xx 에러도 클라이언트 오류로 처리한다", () => {
    const { res, host } = mockHost();
    new GlobalExceptionFilter().catch(Object.assign(new Error("bad"), { statusCode: 400 }), host);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error.code).toBe(ErrorCode.VALIDATION_FAILED);
  });

  it("5xx status를 가진 에러는 그대로 500 INTERNAL로 떨어진다", () => {
    const { res, host } = mockHost();
    new GlobalExceptionFilter().catch(Object.assign(new Error("upstream"), { status: 502 }), host);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].error.code).toBe(ErrorCode.INTERNAL);
  });
});
