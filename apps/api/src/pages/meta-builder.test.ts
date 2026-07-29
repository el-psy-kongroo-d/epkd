import type { PostDetail } from "@epkd/shared";
import { afterEach, describe, expect, it } from "vitest";
import { archiveMeta, notFoundMeta, postMeta, renderHead, renderPostArticle, siteMeta } from "./meta-builder";

const post: PostDetail = {
  no: 3,
  slug: "tom-and-jerry",
  title: 'Tom & Jerry <3 "quotes" \'n stuff',
  date: "2026-07-01",
  readingMinutes: 2,
  excerpt: "a story about & friendship",
  views: 0,
  html: "<p>body</p>",
};

describe("meta-builder", () => {
  afterEach(() => {
    delete process.env.BASE_URL;
  });

  it("renderHead escapes & < > \" ' in title/description/canonical", () => {
    const head = renderHead(postMeta(post, "/posts/tom-and-jerry"));
    expect(head).toContain("Tom &amp; Jerry &lt;3 &quot;quotes&quot; &#39;n stuff");
    expect(head).toContain("<title>Tom &amp; Jerry &lt;3 &quot;quotes&quot; &#39;n stuff · epkd</title>");
    expect(head).toContain('<meta name="description" content="a story about &amp; friendship">');
  });

  it("renderHead escapes '<' inside the JSON-LD block to prevent </script> breakout", () => {
    const head = renderHead(postMeta(post, "/posts/tom-and-jerry"));
    const script = head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1];
    expect(script).not.toContain("<3");
    expect(script).toContain("\\u003c3");
  });

  it("postMeta sets article og:type, canonical from BASE_URL, and JSON-LD BlogPosting", () => {
    process.env.BASE_URL = "https://epkd.example";
    const head = renderHead(postMeta(post, "/posts/tom-and-jerry"));
    expect(head).toContain('<meta property="og:type" content="article">');
    expect(head).toContain('<link rel="canonical" href="https://epkd.example/posts/tom-and-jerry">');
    expect(head).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(head).toContain('<meta property="og:image" content="https://epkd.example/og.png">');
    expect(head).toContain('<meta property="article:published_time" content="2026-07-01">');
    const jsonLdMatch = head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(jsonLdMatch).not.toBeNull();
    const jsonLd = JSON.parse(jsonLdMatch![1]);
    expect(jsonLd["@type"]).toBe("BlogPosting");
    expect(jsonLd.datePublished).toBe("2026-07-01");
    expect(jsonLd.url).toBe("https://epkd.example/posts/tom-and-jerry");
    expect(jsonLd.author).toEqual({ "@type": "Person", name: expect.any(String), url: expect.any(String) });
  });

  it("siteMeta uses website og:type and WebSite JSON-LD; archiveMeta has no jsonLd", () => {
    const head = renderHead(siteMeta("/"));
    expect(head).toContain('<meta property="og:type" content="website">');
    expect(head).toContain('"@type":"WebSite"');
    const archive = renderHead(archiveMeta("/archive"));
    expect(archive).toContain("Archive");
    expect(archive).not.toContain("application/ld+json");
  });

  it("notFoundMeta produces '404 · epkd' title", () => {
    expect(renderHead(notFoundMeta("/posts/ghost"))).toContain("<title>404 · epkd</title>");
  });

  it("renderPostArticle injects escaped title and raw post html with SPA-matching classes", () => {
    const article = renderPostArticle(post);
    expect(article).toContain('class="post-title"');
    expect(article).toContain('class="post-meta"');
    expect(article).toContain('class="post-body"');
    expect(article).toContain("<p>body</p>");
    expect(article).toContain("Tom &amp; Jerry");
  });
});
