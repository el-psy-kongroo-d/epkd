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

  it("GET /api/posts → 최신순 메타 엔벨로프", async () => {
    const res = await request(app.getHttpServer()).get("/api/posts").expect(200);
    expect(res.body.data.map((p: { slug: string }) => p.slug)).toEqual(["second", "first"]);
    expect(res.body.data[0]).not.toHaveProperty("content");
  });

  it("GET /api/posts/:slug → 렌더링된 html 포함", async () => {
    const res = await request(app.getHttpServer()).get("/api/posts/second").expect(200);
    expect(res.body.data.html).toContain("<pre");
  });

  it("미존재 slug → 404 POST_NOT_FOUND", async () => {
    const res = await request(app.getHttpServer()).get("/api/posts/ghost").expect(404);
    expect(res.body.error.code).toBe("POST_NOT_FOUND");
  });

  it("불량 slug(대문자) → 404 POST_NOT_FOUND (경로조작 차단)", async () => {
    await request(app.getHttpServer()).get("/api/posts/NoPe").expect(404);
  });

  it("POST /api/posts/:slug/view → 204, 조회수 1 증가", async () => {
    const before = await request(app.getHttpServer()).get("/api/posts/first").expect(200);
    await request(app.getHttpServer()).post("/api/posts/first/view").expect(204);
    const after = await request(app.getHttpServer()).get("/api/posts/first").expect(200);
    expect(after.body.data.views).toBe(before.body.data.views + 1);
  });

  it("미존재 slug의 view → 404, 인증 없이도 카운트 외 부작용 없음", async () => {
    const res = await request(app.getHttpServer()).post("/api/posts/ghost/view").expect(404);
    expect(res.body.error.code).toBe("POST_NOT_FOUND");
  });

  it("불량 slug의 view → 404 (경로조작 차단)", async () => {
    await request(app.getHttpServer()).post("/api/posts/NoPe/view").expect(404);
  });
});
