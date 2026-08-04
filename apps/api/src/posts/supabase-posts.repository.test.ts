import { Logger } from "@nestjs/common";
import { ErrorCode } from "@epkd/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseService } from "../supabase/supabase.service";
import { SupabasePostsRepository } from "./supabase-posts.repository";

const RAW_DB_ERROR = 'relation "posts" violates check constraint (secret internal detail)';

function fakeSupabaseServiceReturning(error: { message: string } | null, data: unknown = null) {
  const builder = {
    from: () => builder,
    select: () => builder,
    upsert: () => builder,
    delete: () => builder,
    eq: () => builder,
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data, error }),
  };
  return { client: builder } as unknown as SupabaseService;
}

const row = (slug: string, title: string, date: string, content: string) => ({
  slug,
  title,
  date,
  content,
  updated_at: "2026-07-01T00:00:00.000Z",
});

describe("SupabasePostsRepository", () => {
  let loggerSpy: ReturnType<typeof vi.spyOn>;
  let dateSpy: ReturnType<typeof vi.spyOn> | null = null;

  beforeEach(() => {
    loggerSpy = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerSpy.mockRestore();
    dateSpy?.mockRestore();
    dateSpy = null;
  });

  describe("loadAll", () => {
    it("maps rows and sorts by date asc with 1-based no", async () => {
      const rows = [row("newer", "Newer", "2026-07-27", "hello world"), row("older", "Older", "2026-07-01", "hi")];
      const repo = new SupabasePostsRepository(fakeSupabaseServiceReturning(null, rows));
      const posts = await repo.loadAll();
      expect(posts.map((p) => [p.no, p.slug])).toEqual([
        [1, "older"],
        [2, "newer"],
      ]);
      expect(posts[0]).not.toHaveProperty("updated_at");
    });

    it("reuses the cache without refetching during the 30s TTL", async () => {
      const rows = [row("a", "A", "2026-07-01", "x")];
      const client = fakeSupabaseServiceReturning(null, rows);
      const fromSpy = vi.spyOn(client.client as unknown as { from: () => unknown }, "from");
      const repo = new SupabasePostsRepository(client);

      let now = 1_000_000;
      dateSpy = vi.spyOn(Date, "now").mockImplementation(() => now);

      const first = await repo.loadAll();
      const second = await repo.loadAll();
      expect(second).toBe(first);
      expect(fromSpy).toHaveBeenCalledTimes(1);

      now += 30_001;
      const third = await repo.loadAll();
      expect(third).not.toBe(first);
      expect(fromSpy).toHaveBeenCalledTimes(2);
    });

    it("Supabase error → 'internal error' without exposing the raw message", async () => {
      const repo = new SupabasePostsRepository(fakeSupabaseServiceReturning({ message: RAW_DB_ERROR }));
      await expect(repo.loadAll()).rejects.toMatchObject({
        code: ErrorCode.INTERNAL,
        status: 500,
        message: "internal error",
      });
      expect(loggerSpy).toHaveBeenCalled();
      expect(loggerSpy.mock.calls.map((c) => String(c[0])).join("\n")).toContain(RAW_DB_ERROR);
    });

    it("does not cache the result if invalidate (upsert) happens during an in-flight fetch — the next call refetches", async () => {
      let resolveSelect: (v: { data: unknown; error: null }) => void = () => {};
      let selectCalls = 0;
      const builder = {
        from: () => builder,
        select: () => {
          selectCalls++;
          return new Promise((resolve) => {
            resolveSelect = resolve;
          });
        },
        upsert: () => ({ then: (resolve: (v: { error: null }) => unknown) => resolve({ error: null }) }),
        delete: () => builder,
        eq: () => builder,
      };
      const repo = new SupabasePostsRepository({ client: builder } as unknown as SupabaseService);

      const firstLoad = repo.loadAll();
      await repo.upsert({ slug: "x", title: "X", date: "2026-07-01", content: "y" });
      resolveSelect({ data: [row("a", "A", "2026-07-01", "x")], error: null });
      const first = await firstLoad;
      expect(first.map((p) => p.slug)).toEqual(["a"]);

      const secondLoad = repo.loadAll();
      expect(selectCalls).toBe(2);
      resolveSelect({ data: [row("b", "B", "2026-07-02", "y")], error: null });
      const second = await secondLoad;
      expect(second.map((p) => p.slug)).toEqual(["b"]);
    });

    it("concurrent loadAll calls → the actual select runs only once and the same result is shared", async () => {
      let resolveSelect: (v: { data: unknown; error: null }) => void = () => {};
      let selectCalls = 0;
      const builder = {
        from: () => builder,
        select: () => {
          selectCalls++;
          return new Promise((resolve) => {
            resolveSelect = resolve;
          });
        },
        upsert: () => builder,
        delete: () => builder,
        eq: () => builder,
      };
      const repo = new SupabasePostsRepository({ client: builder } as unknown as SupabaseService);

      const [p1, p2, p3] = [repo.loadAll(), repo.loadAll(), repo.loadAll()];
      expect(selectCalls).toBe(1);
      resolveSelect({ data: [row("a", "A", "2026-07-01", "x")], error: null });
      const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
      expect(selectCalls).toBe(1);
      expect(r1).toBe(r2);
      expect(r2).toBe(r3);
    });
  });

  describe("upsert", () => {
    it("invalidates the cache on success so the next loadAll refetches", async () => {
      let call = 0;
      const rows = [[row("a", "A", "2026-07-01", "x")], [row("a", "A2", "2026-07-01", "y")]];
      const builder = {
        from: () => builder,
        select: () => builder,
        upsert: () => ({ then: (resolve: (v: { error: null }) => unknown) => resolve({ error: null }) }),
        delete: () => builder,
        eq: () => builder,
        then: (resolve: (v: { data: unknown; error: null }) => unknown) => resolve({ data: rows[call++], error: null }),
      };
      const repo = new SupabasePostsRepository({ client: builder } as unknown as SupabaseService);

      const first = await repo.loadAll();
      expect(first[0].title).toBe("A");
      expect(call).toBe(1);

      await repo.upsert({ slug: "a", title: "A2", date: "2026-07-01", content: "y" });
      const second = await repo.loadAll();
      expect(second[0].title).toBe("A2");
      expect(call).toBe(2);
    });

    it("Supabase error → 'internal error' without exposing the raw message", async () => {
      const repo = new SupabasePostsRepository(fakeSupabaseServiceReturning({ message: RAW_DB_ERROR }));
      await expect(repo.upsert({ slug: "a", title: "A", date: "2026-07-01", content: "x" })).rejects.toMatchObject({
        code: ErrorCode.INTERNAL,
        status: 500,
        message: "internal error",
      });
    });
  });

  describe("deleteBySlug", () => {
    it("false when no rows were deleted", async () => {
      const repo = new SupabasePostsRepository(fakeSupabaseServiceReturning(null, []));
      expect(await repo.deleteBySlug("ghost")).toBe(false);
    });

    it("true when rows were deleted", async () => {
      const repo = new SupabasePostsRepository(fakeSupabaseServiceReturning(null, [row("a", "A", "2026-07-01", "x")]));
      expect(await repo.deleteBySlug("a")).toBe(true);
    });

    it("Supabase error → 'internal error' without exposing the raw message", async () => {
      const repo = new SupabasePostsRepository(fakeSupabaseServiceReturning({ message: RAW_DB_ERROR }));
      await expect(repo.deleteBySlug("a")).rejects.toMatchObject({
        code: ErrorCode.INTERNAL,
        status: 500,
        message: "internal error",
      });
    });
  });

  describe("findBySlug", () => {
    it("rejects path-traversal slugs outright (null without calling loadAll)", async () => {
      const repo = new SupabasePostsRepository(fakeSupabaseServiceReturning(null, []));
      expect(await repo.findBySlug("../../etc/passwd")).toBeNull();
    });

    it("null when not found", async () => {
      const repo = new SupabasePostsRepository(fakeSupabaseServiceReturning(null, []));
      expect(await repo.findBySlug("nope")).toBeNull();
    });
  });
});
