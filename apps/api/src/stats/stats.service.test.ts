import { Logger } from "@nestjs/common";
import { ErrorCode } from "@epkd/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppException } from "../common/app.exception";
import type { SupabaseService } from "../supabase/supabase.service";
import { StatsService } from "./stats.service";

const RAW_DB_ERROR = 'relation "site_stats" does not exist (secret internal detail)';

function fakeSupabase(options: {
  selectData?: unknown;
  selectError?: { message: string } | null;
  rpcData?: unknown;
  rpcError?: { message: string } | null;
}) {
  const builder = {
    from: () => builder,
    select: () => builder,
    eq: () => builder,
    single: async () => ({ data: options.selectData ?? null, error: options.selectError ?? null }),
  };
  const client = {
    ...builder,
    rpc: async () => ({ data: options.rpcData ?? null, error: options.rpcError ?? null }),
  };
  return { client } as unknown as SupabaseService;
}

describe("StatsService", () => {
  let loggerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    loggerSpy = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });
  afterEach(() => loggerSpy.mockRestore());

  it("total은 site_stats 행을 카멜케이스로 반환한다", async () => {
    const service = new StatsService(fakeSupabase({ selectData: { total_visits: 42 } }));
    await expect(service.total()).resolves.toEqual({ totalVisits: 42 });
  });

  it("total은 값이 비어 있으면 0으로 떨어진다", async () => {
    const service = new StatsService(fakeSupabase({ selectData: { total_visits: null } }));
    await expect(service.total()).resolves.toEqual({ totalVisits: 0 });
  });

  it("recordVisit은 RPC가 돌려준 증가 후 값을 반환한다", async () => {
    const service = new StatsService(fakeSupabase({ rpcData: 7 }));
    await expect(service.recordVisit()).resolves.toEqual({ totalVisits: 7 });
  });

  it("DB 오류는 원문을 숨기고 INTERNAL로 변환한다", async () => {
    const service = new StatsService(fakeSupabase({ selectError: { message: RAW_DB_ERROR } }));
    await expect(service.total()).rejects.toMatchObject({ code: ErrorCode.INTERNAL, status: 500 });
    await expect(service.total()).rejects.toBeInstanceOf(AppException);
    const thrown = await service.total().catch((e: unknown) => e as AppException);
    expect((thrown as AppException).message).not.toContain("secret internal detail");
    expect(loggerSpy).toHaveBeenCalled();
  });

  it("RPC 오류도 INTERNAL로 변환한다", async () => {
    const service = new StatsService(fakeSupabase({ rpcError: { message: RAW_DB_ERROR } }));
    await expect(service.recordVisit()).rejects.toMatchObject({ code: ErrorCode.INTERNAL });
  });
});
