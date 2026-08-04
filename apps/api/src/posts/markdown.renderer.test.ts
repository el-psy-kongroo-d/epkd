import { describe, expect, it } from "vitest";
import { MarkdownRenderer } from "./markdown.renderer";

describe("MarkdownRenderer", () => {
  const renderer = new MarkdownRenderer();

  it("basic markdown → HTML", async () => {
    const html = await renderer.render("# Title\n\nhello **bold**");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
  });

  it("code blocks keep shiki highlighting spans", async () => {
    const html = await renderer.render("```python\nprint('hi')\n```");
    expect(html).toContain("<pre");
    expect(html).toContain("<span");
  });

  it("strips script tags and event handlers (XSS)", async () => {
    const html = await renderer.render('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
  });
});
