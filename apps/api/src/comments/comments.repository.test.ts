import { Logger } from "@nestjs/common";
import { ErrorCode } from "@epkd/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommentsRepository } from "./comments.repository";

const RAW_DB_ERROR = 'relation "comments" violates check constraint "comments_body_check" (secret internal detail)';

function fakeSupabaseServiceReturning(error: { message: string } | null, data: unknown = null) {
  const builder = {
    from: () => builder,
    select: () => builder,
    insert: () => builder,
    delete: () => builder,
    eq: () => builder,
    order: () => Promise.resolve({ data, error }),
    single: () => Promise.resolve({ data, error }),
    maybeSingle: () => Promise.resolve({ data, error }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data, error }),
  };
  return { client: builder } as never;
}

describe("CommentsRepository — Supabase 에러 처리", () => {
  let loggerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    loggerSpy = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerSpy.mockRestore();
  });

  it("listBySlug: Supabase 원문 에러 대신 고정 'internal error' 메시지를 던진다", async () => {
    const repo = new CommentsRepository(fakeSupabaseServiceReturning({ message: RAW_DB_ERROR }));
    await expect(repo.listBySlug("hello-world")).rejects.toMatchObject({
      code: ErrorCode.INTERNAL,
      status: 500,
      message: "internal error",
    });
  });

  it("insert: 원문 에러는 응답에 노출되지 않고 서버 로그에만 남는다", async () => {
    const repo = new CommentsRepository(fakeSupabaseServiceReturning({ message: RAW_DB_ERROR }));
    await expect(
      repo.insert({ post_slug: "hello-world", nickname: "n", password_hash: "h", body: "b" }),
    ).rejects.toMatchObject({ code: ErrorCode.INTERNAL, status: 500, message: "internal error" });

    expect(loggerSpy).toHaveBeenCalled();
    const logged = loggerSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(logged).toContain(RAW_DB_ERROR);
  });

  it("findById: 원문 에러 노출 없이 고정 메시지", async () => {
    const repo = new CommentsRepository(fakeSupabaseServiceReturning({ message: RAW_DB_ERROR }));
    await expect(repo.findById(1)).rejects.toMatchObject({ code: ErrorCode.INTERNAL, status: 500, message: "internal error" });
  });

  it("deleteById: 원문 에러 노출 없이 고정 메시지", async () => {
    const repo = new CommentsRepository(fakeSupabaseServiceReturning({ message: RAW_DB_ERROR }));
    await expect(repo.deleteById(1)).rejects.toMatchObject({ code: ErrorCode.INTERNAL, status: 500, message: "internal error" });
  });

  it("에러 없음 → 정상적으로 데이터 반환", async () => {
    const row = { id: 1, post_slug: "hello-world", nickname: "n", password_hash: "h", body: "b", created_at: "now" };
    const repo = new CommentsRepository(fakeSupabaseServiceReturning(null, [row]));
    await expect(repo.listBySlug("hello-world")).resolves.toEqual([row]);
  });
});
