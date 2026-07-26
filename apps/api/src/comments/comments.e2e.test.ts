import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GlobalExceptionFilter } from "../common/global-exception.filter";
import { ResponseInterceptor } from "../common/response.interceptor";
import { InMemoryPostsRepository } from "../posts/in-memory-posts.repository";
import { PostsModule } from "../posts/posts.module";
import { PostsRepository } from "../posts/posts.repository";
import { CommentsModule } from "./comments.module";
import { CommentsRepository, type CommentRow, type NewCommentRow } from "./comments.repository";

class InMemoryCommentsRepository {
  rows: CommentRow[] = [];
  private nextId = 1;

  async listBySlug(slug: string): Promise<CommentRow[]> {
    return this.rows.filter((r) => r.post_slug === slug).sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  async insert(row: NewCommentRow): Promise<CommentRow> {
    const id = this.nextId++;
    const saved: CommentRow = { id, created_at: new Date(2026, 0, id).toISOString(), ...row };
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

describe("Comments API", () => {
  let app: INestApplication;
  let repo: InMemoryCommentsRepository;

  beforeAll(async () => {
    process.env.PUBLISH_TOKEN = "test-token";
    const posts = new InMemoryPostsRepository();
    posts.seed([{ slug: "hello-world", title: "Hello", date: "2026-07-01", content: "hello" }]);

    repo = new InMemoryCommentsRepository();
    const moduleRef = await Test.createTestingModule({ imports: [PostsModule, CommentsModule] })
      .overrideProvider(PostsRepository)
      .useValue(posts)
      .overrideProvider(CommentsRepository)
      .useValue(repo)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });
  afterAll(async () => app.close());

  it("작성 후 목록에 오래된 순으로 노출", async () => {
    await request(app.getHttpServer())
      .post("/api/posts/hello-world/comments")
      .send({ nickname: "first", password: "pass1234", body: "first!" })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/posts/hello-world/comments")
      .send({ nickname: "second", password: "pass1234", body: "second!" })
      .expect(201);

    const res = await request(app.getHttpServer()).get("/api/posts/hello-world/comments").expect(200);
    expect(res.body.data.map((c: { nickname: string }) => c.nickname)).toEqual(["first", "second"]);
    expect(res.body.data[0]).not.toHaveProperty("password_hash");
    expect(res.body.data[0]).not.toHaveProperty("passwordHash");
  });

  it("존재하지 않는 글 slug → 404 POST_NOT_FOUND", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/posts/ghost-slug/comments")
      .send({ nickname: "a", password: "pass1234", body: "hi" })
      .expect(404);
    expect(res.body.error.code).toBe("POST_NOT_FOUND");
  });

  it("허니팟(website) 채움 → 200대 가짜 성공이지만 저장 안 됨", async () => {
    const before = (await request(app.getHttpServer()).get("/api/posts/hello-world/comments").expect(200)).body.data
      .length;

    const res = await request(app.getHttpServer())
      .post("/api/posts/hello-world/comments")
      .send({ nickname: "bot", password: "pass1234", body: "spam", website: "http://spam.example" })
      .expect(201);
    expect(res.body.data.nickname).toBe("bot");

    const after = (await request(app.getHttpServer()).get("/api/posts/hello-world/comments").expect(200)).body.data
      .length;
    expect(after).toBe(before);
  });

  it("25자 닉네임 → 400 VALIDATION_FAILED", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/posts/hello-world/comments")
      .send({ nickname: "a".repeat(25), password: "pass1234", body: "hi" })
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("잘못된 비밀번호로 삭제 시도 → 403 FORBIDDEN", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/posts/hello-world/comments")
      .send({ nickname: "victim", password: "correct-pw", body: "delete me" })
      .expect(201);

    const res = await request(app.getHttpServer())
      .delete(`/api/comments/${created.body.data.id}`)
      .send({ password: "wrong-pw" })
      .expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("관리자 Bearer 토큰 → 비밀번호 없이 삭제 성공", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/posts/hello-world/comments")
      .send({ nickname: "admin-target", password: "correct-pw", body: "delete me too" })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/comments/${created.body.data.id}`)
      .set("Authorization", "Bearer test-token")
      .send({})
      .expect(204);

    expect(await repo.findById(created.body.data.id)).toBeNull();
  });

  it("존재하지 않는 댓글 삭제 → 404 COMMENT_NOT_FOUND", async () => {
    const res = await request(app.getHttpServer())
      .delete("/api/comments/999999")
      .send({ password: "whatever" })
      .expect(404);
    expect(res.body.error.code).toBe("COMMENT_NOT_FOUND");
  });
});
