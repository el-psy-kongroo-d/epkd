import { Controller, Get, Header, NotFoundException, Param, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { AppException } from "../common/app.exception";
import { PostsService } from "../posts/posts.service";
import { archiveMeta, baseUrl, notFoundMeta, postMeta, renderHead, renderPostArticle, siteMeta } from "./meta-builder";
import { PagesService } from "./pages.service";

const NOT_BUILT_MESSAGE = "not built";

@Controller()
export class PagesController {
  constructor(
    private readonly pages: PagesService,
    private readonly posts: PostsService,
  ) {}

  @Get()
  home(@Res({ passthrough: true }) res: Response): string {
    if (!this.pages.available) return this.notBuilt(res);
    return this.pages.render(renderHead(siteMeta("/")));
  }

  @Get("archive")
  archive(@Res({ passthrough: true }) res: Response): string {
    if (!this.pages.available) return this.notBuilt(res);
    return this.pages.render(renderHead(archiveMeta("/archive")));
  }

  @Get("posts/:slug")
  async post(@Param("slug") slug: string, @Res({ passthrough: true }) res: Response): Promise<string> {
    if (!this.pages.available) return this.notBuilt(res);
    try {
      const post = await this.posts.get(slug);
      const head = renderHead(postMeta(post, `/posts/${slug}`));
      return this.pages.render(head, renderPostArticle(post));
    } catch (e) {
      if (e instanceof AppException && e.status === 404) {
        res.status(404);
        return this.pages.render(renderHead(notFoundMeta(`/posts/${slug}`)));
      }
      throw e;
    }
  }

  @Get("sitemap.xml")
  @Header("Content-Type", "application/xml; charset=utf-8")
  async sitemap(): Promise<string> {
    const base = baseUrl();
    const posts = await this.posts.list();
    const urls = [
      { loc: `${base}/` },
      { loc: `${base}/archive` },
      ...posts.map((p) => ({ loc: `${base}/posts/${p.slug}`, lastmod: p.date })),
    ];
    const body = urls
      .map(
        (u) =>
          `  <url>\n    <loc>${u.loc}</loc>${"lastmod" in u ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}\n  </url>`,
      )
      .join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
  }

  @Get("robots.txt")
  @Header("Content-Type", "text/plain; charset=utf-8")
  robots(): string {
    return `User-agent: *\nAllow: /\nSitemap: ${baseUrl()}/sitemap.xml`;
  }

  @Get("*")
  fallback(@Req() req: Request, @Res({ passthrough: true }) res: Response): string {
    if (req.path.startsWith("/api") || req.path.startsWith("/rss")) throw new NotFoundException();
    if (!this.pages.available) return this.notBuilt(res);
    res.status(404);
    return this.pages.render(renderHead(notFoundMeta(req.path)));
  }

  private notBuilt(res: Response): string {
    res.status(404);
    res.type("text/plain");
    return NOT_BUILT_MESSAGE;
  }
}
