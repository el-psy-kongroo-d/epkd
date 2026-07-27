import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ErrorCode } from "@epkd/shared";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppException } from "../common/app.exception";
import { GlobalExceptionFilter } from "../common/global-exception.filter";
import { ResponseInterceptor } from "../common/response.interceptor";
import { InMemoryPostsRepository } from "../posts/in-memory-posts.repository";
import { PostsModule } from "../posts/posts.module";
import { PostsRepository } from "../posts/posts.repository";
import { PostsService } from "../posts/posts.service";
import { PagesModule } from "./pages.module";

const FIXTURE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>epkd</title>
    <link rel="alternate" type="application/rss+xml" title="epkd" href="/rss.xml">
    <!--head-->
  </head>
  <body>
    <div id="root"><!--app--></div>
  </body>
</html>
`;

async function buildApp(): Promise<{ app: INestApplication; repo: InMemoryPostsRepository }> {
  const repo = new InMemoryPostsRepository();
  repo.seed([
    { slug: "amp-title", title: 'Tom & Jerry <3 "quotes"', date: "2026-07-01", content: "a story about friendship" },
    { slug: "second", title: "Second Entry", date: "2026-07-10", content: "more words here" },
  ]);
  const moduleRef = await Test.createTestingModule({ imports: [PostsModule, PagesModule] })
    .overrideProvider(PostsRepository)
    .useValue(repo)
    .compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  await app.init();
  return { app, repo };
}

describe("Pages SSR-lite (dist present)", () => {
  let app: INestApplication;
  let distDir: string;

  beforeAll(async () => {
    process.env.BASE_URL = "https://epkd.example";
    distDir = mkdtempSync(path.join(tmpdir(), "epkd-web-dist-"));
    writeFileSync(path.join(distDir, "index.html"), FIXTURE_HTML);
    process.env.WEB_DIST = path.join(distDir, "index.html");
    ({ app } = await buildApp());
  });
  afterAll(async () => {
    await app.close();
    delete process.env.WEB_DIST;
    delete process.env.BASE_URL;
    rmSync(distDir, { recursive: true, force: true });
  });

  it("GET / → site meta injected, envelope bypassed", async () => {
    const res = await request(app.getHttpServer()).get("/").expect(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text).toContain("<title>epkd</title>");
    expect(res.text).toContain('<link rel="canonical" href="https://epkd.example/">');
    expect(res.text).not.toContain('"data"');
  });

  it("GET /archive → archive meta injected", async () => {
    const res = await request(app.getHttpServer()).get("/archive").expect(200);
    expect(res.text).toContain("Archive");
    expect(res.text).toContain('<link rel="canonical" href="https://epkd.example/archive">');
  });

  it("GET /posts/:slug → title/og/canonical/JSON-LD + server-rendered article, with escaping", async () => {
    const res = await request(app.getHttpServer()).get("/posts/amp-title").expect(200);
    expect(res.text).toContain("Tom &amp; Jerry &lt;3 &quot;quotes&quot; · epkd");
    expect(res.text).toContain('<meta property="og:type" content="article">');
    expect(res.text).toContain('<link rel="canonical" href="https://epkd.example/posts/amp-title">');
    expect(res.text).toContain('<script type="application/ld+json">');
    expect(res.text).toContain('"@type":"BlogPosting"');
    expect(res.text).toContain('class="post-title"');
    expect(res.text).toContain('class="post-body"');
    expect(res.text).not.toContain('"data"');
  });

  it("GET /posts/:missing → 404 status + '404 · epkd' meta, empty app", async () => {
    const res = await request(app.getHttpServer()).get("/posts/ghost").expect(404);
    expect(res.text).toContain("<title>404 · epkd</title>");
    expect(res.text).not.toContain('class="post-title"');
  });

  it("GET /whatever (unknown SPA route) → 404 + site meta fallback", async () => {
    const res = await request(app.getHttpServer()).get("/whatever").expect(404);
    expect(res.text).toContain("404 · epkd");
  });

  it("GET /sitemap.xml → home/archive + all post URLs with lastmod", async () => {
    const res = await request(app.getHttpServer()).get("/sitemap.xml").expect(200);
    expect(res.headers["content-type"]).toContain("application/xml");
    expect(res.text).toContain("<loc>https://epkd.example/</loc>");
    expect(res.text).toContain("<loc>https://epkd.example/archive</loc>");
    expect(res.text).toContain("<loc>https://epkd.example/posts/amp-title</loc>");
    expect(res.text).toContain("<lastmod>2026-07-01</lastmod>");
    expect(res.text).toContain("<loc>https://epkd.example/posts/second</loc>");
  });

  it("GET /robots.txt → Allow + Sitemap line, envelope bypassed", async () => {
    const res = await request(app.getHttpServer()).get("/robots.txt").expect(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.text).toContain("Allow: /");
    expect(res.text).toContain("Sitemap: https://epkd.example/sitemap.xml");
  });

  it("GET /api/posts → still wrapped in {data} envelope (interceptor regression)", async () => {
    const res = await request(app.getHttpServer()).get("/api/posts").expect(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.map((p: { slug: string }) => p.slug)).toContain("amp-title");
  });

  it("GET /api/nope (unknown api path) → 404 error envelope, not HTML wrapped as data", async () => {
    const res = await request(app.getHttpServer()).get("/api/nope").expect(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(res.body.data).toBeUndefined();
  });

  it("GET /rss/nope (unknown rss path) → 404 error envelope", async () => {
    const res = await request(app.getHttpServer()).get("/rss/nope").expect(404);
    expect(res.body.error).toBeDefined();
  });

  it("every SSR-lite route emits exactly one <title> tag (no duplicate from static template)", async () => {
    const routes = ["/", "/archive", "/posts/amp-title", "/posts/ghost", "/whatever"];
    for (const route of routes) {
      const res = await request(app.getHttpServer()).get(route);
      const titleCount = (res.text.match(/<title>/g) ?? []).length;
      expect(titleCount, `route ${route}`).toBe(1);
    }
  });

  it("GET /posts/:slug → PostsService failure other than 404 surfaces as 500, not a 404 page", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [PostsModule, PagesModule] })
      .overrideProvider(PostsRepository)
      .useValue(new InMemoryPostsRepository())
      .overrideProvider(PostsService)
      .useValue({
        get: () => {
          throw new AppException(ErrorCode.INTERNAL, 500, "internal error");
        },
        list: () => Promise.resolve([]),
      })
      .compile();
    const brokenApp = moduleRef.createNestApplication();
    brokenApp.useGlobalFilters(new GlobalExceptionFilter());
    brokenApp.useGlobalInterceptors(new ResponseInterceptor());
    await brokenApp.init();

    const res = await request(brokenApp.getHttpServer()).get("/posts/whatever").expect(500);
    expect(res.text).not.toContain("404 · epkd");

    await brokenApp.close();
  });
});

describe("Pages SSR-lite (dist missing — dev mode)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.WEB_DIST = path.join(tmpdir(), "epkd-does-not-exist", "index.html");
    ({ app } = await buildApp());
  });
  afterAll(async () => {
    await app.close();
    delete process.env.WEB_DIST;
  });

  it("GET / → 404 plain text 'not built', does not throw", async () => {
    const res = await request(app.getHttpServer()).get("/").expect(404);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.text).toBe("not built");
  });

  it("GET /api/posts still works normally when dist is missing", async () => {
    const res = await request(app.getHttpServer()).get("/api/posts").expect(200);
    expect(res.body.data).toBeDefined();
  });
});
