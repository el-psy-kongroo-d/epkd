import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ResponseInterceptor } from "../common/response.interceptor";
import { InMemoryPostsRepository } from "../posts/in-memory-posts.repository";
import { PostsModule } from "../posts/posts.module";
import { PostsRepository } from "../posts/posts.repository";
import { RssModule } from "./rss.module";

describe("GET /rss.xml", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.BASE_URL = "https://epkd.example";
    const repo = new InMemoryPostsRepository();
    repo.seed([{ slug: "amp-title", title: "Tom & Jerry <3", date: "2026-07-01", content: "x" }]);
    const moduleRef = await Test.createTestingModule({ imports: [PostsModule, RssModule] })
      .overrideProvider(PostsRepository)
      .useValue(repo)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });
  afterAll(async () => app.close());

  it("RSS 2.0 XML + 특수문자 이스케이프 + 엔벨로프 미적용", async () => {
    const res = await request(app.getHttpServer()).get("/rss.xml").expect(200);
    expect(res.headers["content-type"]).toContain("application/rss+xml");
    expect(res.text).toContain("<rss version=\"2.0\">");
    expect(res.text).toContain("Tom &amp; Jerry &lt;3");
    expect(res.text).toContain("https://epkd.example/posts/amp-title");
    expect(res.text).not.toContain("\"data\"");
  });
});
