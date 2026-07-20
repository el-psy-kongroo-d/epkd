import { Controller, Get, Header } from "@nestjs/common";
import { DEFAULT_BASE_URL, SITE_DESCRIPTION, SITE_NAME } from "@epkd/shared";
import { PostsService } from "../posts/posts.service";

const escapeXml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

@Controller()
export class RssController {
  constructor(private readonly postsService: PostsService) {}

  @Get("rss.xml")
  @Header("Content-Type", "application/rss+xml; charset=utf-8")
  async feed(): Promise<string> {
    const base = process.env.BASE_URL ?? DEFAULT_BASE_URL;
    const items = (await this.postsService.list())
      .map(
        (p) => `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${base}/posts/${p.slug}</link>
      <guid>${base}/posts/${p.slug}</guid>
      <pubDate>${new Date(`${p.date}T00:00:00Z`).toUTCString()}</pubDate>
      <description>${escapeXml(p.excerpt)}</description>
    </item>`,
      )
      .join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${base}</link>
    <description>${SITE_DESCRIPTION}</description>
${items}
  </channel>
</rss>`;
  }
}
