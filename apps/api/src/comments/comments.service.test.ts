import { ErrorCode } from "@epkd/shared";
import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppException } from "../common/app.exception";
import type { CommentRow, NewCommentRow } from "./comments.repository";
import { CommentsService } from "./comments.service";

class FakeRepository {
  rows: CommentRow[] = [];
  private nextId = 1;

  async listBySlug(slug: string): Promise<CommentRow[]> {
    return this.rows.filter((r) => r.post_slug === slug).sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  async insert(row: NewCommentRow): Promise<CommentRow> {
    const saved: CommentRow = { id: this.nextId++, created_at: new Date(this.nextId).toISOString(), ...row };
    this.rows.push(saved);
    return saved;
  }

  async findById(id: number): Promise<CommentRow | null> {
    return this.rows.find((r) => r.id === id) ?? null;
  }

  async deleteById(id: number): Promise<void> {
    this.rows = this.rows.filter((r) => r.id !== id);
  }
}

class FakePostsService {
  missingSlugs = new Set<string>();
  async get(slug: string): Promise<unknown> {
    if (this.missingSlugs.has(slug)) {
      throw new AppException(ErrorCode.POST_NOT_FOUND, 404, `entry not found: ${slug}`);
    }
    return { slug };
  }
}

describe("CommentsService", () => {
  let repo: FakeRepository;
  let posts: FakePostsService;
  let service: CommentsService;

  beforeEach(() => {
    repo = new FakeRepository();
    posts = new FakePostsService();
    service = new CommentsService(repo as never, posts as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists comments oldest-first after creation", async () => {
    await service.create("hello-world", { nickname: "a", password: "pass1", body: "first" });
    await service.create("hello-world", { nickname: "b", password: "pass2", body: "second" });

    const list = await service.list("hello-world");
    expect(list.map((c) => c.body)).toEqual(["first", "second"]);
    expect(list[0].postSlug).toBe("hello-world");
  });

  it("nonexistent slug → POST_NOT_FOUND 404", async () => {
    posts.missingSlugs.add("ghost");
    await expect(service.create("ghost", { nickname: "a", password: "pass1", body: "hi" })).rejects.toMatchObject({
      code: ErrorCode.POST_NOT_FOUND,
      status: 404,
    });
  });

  it("honeypot (website) filled → fake success, nothing saved (response after a random delay)", async () => {
    vi.useFakeTimers();
    try {
      const pending = service.create("hello-world", {
        nickname: "bot",
        password: "pass1",
        body: "spam",
        website: "http://spam.example",
      });
      await vi.advanceTimersByTimeAsync(300);
      const result = await pending;

      expect(result.id).toBe(0);
      expect(result.nickname).toBe("bot");
      expect(result.body).toBe("spam");
      expect(await service.list("hello-world")).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("25-char nickname → 400 VALIDATION_FAILED", async () => {
    await expect(
      service.create("hello-world", { nickname: "a".repeat(25), password: "pass1", body: "hi" }),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED, status: 400 });
  });

  it("deleting a nonexistent comment → COMMENT_NOT_FOUND 404", async () => {
    await expect(service.remove("999", { password: "pass1" }, undefined)).rejects.toMatchObject({
      code: ErrorCode.COMMENT_NOT_FOUND,
      status: 404,
    });
  });

  it("wrong password → 403 FORBIDDEN", async () => {
    const created = await service.create("hello-world", { nickname: "a", password: "correct-pw", body: "hi" });
    await expect(service.remove(String(created.id), { password: "wrong-pw" }, undefined)).rejects.toMatchObject({
      code: ErrorCode.FORBIDDEN,
      status: 403,
    });
  });

  it("correct password → deletion succeeds", async () => {
    const created = await service.create("hello-world", { nickname: "a", password: "correct-pw", body: "hi" });
    await service.remove(String(created.id), { password: "correct-pw" }, undefined);
    expect(await repo.findById(created.id)).toBeNull();
  });

  it("admin Bearer token → deletion succeeds without a password", async () => {
    process.env.PUBLISH_TOKEN = "admin-secret";
    const created = await service.create("hello-world", { nickname: "a", password: "correct-pw", body: "hi" });
    await service.remove(String(created.id), {}, "Bearer admin-secret");
    expect(await repo.findById(created.id)).toBeNull();
  });

  it("stores password_hash as a bcrypt hash", async () => {
    const created = await service.create("hello-world", { nickname: "a", password: "correct-pw", body: "hi" });
    const row = await repo.findById(created.id);
    expect(row?.password_hash).not.toBe("correct-pw");
    expect(await bcrypt.compare("correct-pw", row?.password_hash ?? "")).toBe(true);
  });
});
