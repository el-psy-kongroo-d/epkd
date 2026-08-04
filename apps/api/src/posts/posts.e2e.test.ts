import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GlobalExceptionFilter } from "../common/global-exception.filter";
import { ResponseInterceptor } from "../common/response.interceptor";
import { InMemoryPostsRepository } from "./in-memory-posts.repository";
import { PostsModule } from "./posts.module";
import { PostsRepository } from "./posts.repository";

describe("Posts API", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const repo = new InMemoryPostsRepository();
    repo.seed([
      { slug: "first", title: "First", date: "2026-07-01", content: "hello" },
      { slug: "second", title: "Second", date: "2026-07-10", content: "```js\n1\n```" },
    ]);
    const moduleRef = await Test.createTestingModule({ imports: [PostsModule] })
      .overrideProvider(PostsRepository)
      .useValue(repo)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });
  afterAll(async () => app.close());

  it("GET /api/posts → newest-first meta envelope", async () => {
    const res = await request(app.getHttpServer()).get("/api/posts").expect(200);
    expect(res.body.data.map((p: { slug: string }) => p.slug)).toEqual(["second", "first"]);
    expect(res.body.data[0]).not.toHaveProperty("content");
  });

  it("GET /api/posts/:slug → includes rendered html", async () => {
    const res = await request(app.getHttpServer()).get("/api/posts/second").expect(200);
    expect(res.body.data.html).toContain("<pre");
  });

  it("nonexistent slug → 404 POST_NOT_FOUND", async () => {
    const res = await request(app.getHttpServer()).get("/api/posts/ghost").expect(404);
    expect(res.body.error.code).toBe("POST_NOT_FOUND");
  });

  it("bad slug (uppercase) → 404 POST_NOT_FOUND (path traversal blocked)", async () => {
    await request(app.getHttpServer()).get("/api/posts/NoPe").expect(404);
  });

  it("POST /api/posts/:slug/view → 204, view count increments by 1", async () => {
    const before = await request(app.getHttpServer()).get("/api/posts/first").expect(200);
    await request(app.getHttpServer()).post("/api/posts/first/view").expect(204);
    const after = await request(app.getHttpServer()).get("/api/posts/first").expect(200);
    expect(after.body.data.views).toBe(before.body.data.views + 1);
  });

  it("view on a nonexistent slug → 404, no side effects beyond the count even without auth", async () => {
    const res = await request(app.getHttpServer()).post("/api/posts/ghost/view").expect(404);
    expect(res.body.error.code).toBe("POST_NOT_FOUND");
  });

  it("view on a bad slug → 404 (path traversal blocked)", async () => {
    await request(app.getHttpServer()).post("/api/posts/NoPe/view").expect(404);
  });
});
