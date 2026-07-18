import { PublishPostSchema } from "@epkd/shared";
import { describe, expect, it } from "vitest";
import { AppException } from "./app.exception";
import { ZodValidationPipe } from "./zod-validation.pipe";

describe("ZodValidationPipe", () => {
  const pipe = new ZodValidationPipe(PublishPostSchema);
  it("유효 페이로드는 파싱 결과 반환", () => {
    const dto = { slug: "a-post", title: "t", date: "2026-07-28", content: "hi" };
    expect(pipe.transform(dto)).toEqual(dto);
  });
  it("무효 페이로드는 VALIDATION_FAILED AppException", () => {
    try {
      pipe.transform({ slug: "../evil" });
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(AppException);
      expect((e as AppException).status).toBe(400);
    }
  });
});
