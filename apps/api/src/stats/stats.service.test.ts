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

  it("total returns the site_stats row in camelCase", async () => {
    const service = new StatsService(fakeSupabase({ selectData: { total_visits: 42 } }));
    await expect(service.total()).resolves.toEqual({ totalVisits: 42 });
  });

  it("total falls back to 0 when values are empty", async () => {
    const service = new StatsService(fakeSupabase({ selectData: { total_visits: null } }));
    await expect(service.total()).resolves.toEqual({ totalVisits: 0 });
  });

  it("recordVisit returns the post-increment value from the RPC", async () => {
    const service = new StatsService(fakeSupabase({ rpcData: 7 }));
    await expect(service.recordVisit()).resolves.toEqual({ totalVisits: 7 });
  });

  it("converts DB errors to INTERNAL, hiding the raw message", async () => {
    const service = new StatsService(fakeSupabase({ selectError: { message: RAW_DB_ERROR } }));
    await expect(service.total()).rejects.toMatchObject({ code: ErrorCode.INTERNAL, status: 500 });
    await expect(service.total()).rejects.toBeInstanceOf(AppException);
    const thrown = await service.total().catch((e: unknown) => e as AppException);
    expect((thrown as AppException).message).not.toContain("secret internal detail");
    expect(loggerSpy).toHaveBeenCalled();
  });

  it("converts RPC errors to INTERNAL as well", async () => {
    const service = new StatsService(fakeSupabase({ rpcError: { message: RAW_DB_ERROR } }));
    await expect(service.recordVisit()).rejects.toMatchObject({ code: ErrorCode.INTERNAL });
  });
});
