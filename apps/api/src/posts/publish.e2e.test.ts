import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GlobalExceptionFilter } from "../common/global-exception.filter";
import { ResponseInterceptor } from "../common/response.interceptor";
import { InMemoryPostsRepository } from "./in-memory-posts.repository";
import { PostsModule } from "./posts.module";
import { PostsRepository } from "./posts.repository";

const dto = { slug: "new-entry", title: "New", date: "2026-07-28", content: "# hi" };

describe("POST/DELETE /api/posts", () => {
  let app: INestApplication;
  let repo: InMemoryPostsRepository;

  beforeAll(async () => {
    process.env.PUBLISH_TOKEN = "test-token";
    repo = new InMemoryPostsRepository();
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

  it("토큰 없음 → 401 UNAUTHORIZED", async () => {
    const res = await request(app.getHttpServer()).post("/api/posts").send(dto).expect(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("유효 토큰 → 201 + 메타 반환, 이후 목록에 노출", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/posts")
      .set("Authorization", "Bearer test-token")
      .send(dto)
      .expect(201);
    expect(res.body.data.slug).toBe("new-entry");
    const list = await request(app.getHttpServer()).get("/api/posts").expect(200);
    expect(list.body.data.map((p: { slug: string }) => p.slug)).toContain("new-entry");
  });

  it("같은 slug로 재발행 → upsert로 내용이 갱신된다 (더 이상 409가 아님)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/posts")
      .set("Authorization", "Bearer test-token")
      .send({ ...dto, title: "New (edited)", content: "# hi again" })
      .expect(201);
    expect(res.body.data.title).toBe("New (edited)");

    const detail = await request(app.getHttpServer()).get("/api/posts/new-entry").expect(200);
    expect(detail.body.data.html).toContain("hi again");
  });

  it("무효 페이로드(경로조작 slug) → 400 VALIDATION_FAILED", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/posts")
      .set("Authorization", "Bearer test-token")
      .send({ ...dto, slug: "../evil" })
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("draft: true → 400 VALIDATION_FAILED, 저장되지 않는다 (CLI가 거르지만 서버도 이중 확인)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/posts")
      .set("Authorization", "Bearer test-token")
      .send({ slug: "should-not-exist", title: "Draft", date: "2026-07-28", content: "x", draft: true })
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");

    const list = await request(app.getHttpServer()).get("/api/posts").expect(200);
    expect(list.body.data.map((p: { slug: string }) => p.slug)).not.toContain("should-not-exist");
  });

  it("DELETE 토큰 없음 → 401 UNAUTHORIZED", async () => {
    await request(app.getHttpServer()).delete("/api/posts/new-entry").expect(401);
  });

  it("DELETE 미존재 slug → 404 POST_NOT_FOUND", async () => {
    const res = await request(app.getHttpServer())
      .delete("/api/posts/ghost-slug")
      .set("Authorization", "Bearer test-token")
      .expect(404);
    expect(res.body.error.code).toBe("POST_NOT_FOUND");
  });

  it("DELETE 유효 토큰 → 204, 이후 목록에서 사라진다", async () => {
    await request(app.getHttpServer())
      .delete("/api/posts/new-entry")
      .set("Authorization", "Bearer test-token")
      .expect(204);

    const list = await request(app.getHttpServer()).get("/api/posts").expect(200);
    expect(list.body.data.map((p: { slug: string }) => p.slug)).not.toContain("new-entry");
  });
});
