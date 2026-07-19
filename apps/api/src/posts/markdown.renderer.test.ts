import { describe, expect, it } from "vitest";
import { MarkdownRenderer } from "./markdown.renderer";

describe("MarkdownRenderer", () => {
  const renderer = new MarkdownRenderer();

  it("기본 마크다운 → HTML", async () => {
    const html = await renderer.render("# Title\n\nhello **bold**");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
  });

  it("코드 블록은 shiki 하이라이팅 span 유지", async () => {
    const html = await renderer.render("```python\nprint('hi')\n```");
    expect(html).toContain("<pre");
    expect(html).toContain("<span");
  });

  it("script 태그·이벤트 핸들러는 제거 (XSS)", async () => {
    const html = await renderer.render('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
  });
});
