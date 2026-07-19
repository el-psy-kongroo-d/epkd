import { createHash } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { ErrorCode, type PostDetail, type PostMeta, type PublishPost } from "@epkd/shared";
import { AppException } from "../common/app.exception";
import { MarkdownRenderer } from "./markdown.renderer";
import type { RawPost } from "./post-derive";
import { PostsRepository } from "./posts.repository";

const toMeta = ({ content: _content, ...meta }: RawPost): PostMeta => meta;

@Injectable()
export class PostsService {
  private readonly renderCache = new Map<string, { hash: string; html: string }>();

  constructor(
    @Inject(PostsRepository) private readonly repository: PostsRepository,
    @Inject(MarkdownRenderer) private readonly renderer: MarkdownRenderer,
  ) {}

  async list(): Promise<PostMeta[]> {
    const all = await this.repository.loadAll();
    return all.map(toMeta).reverse();
  }

  async get(slug: string): Promise<PostDetail> {
    const post = await this.repository.findBySlug(slug);
    if (!post) throw new AppException(ErrorCode.POST_NOT_FOUND, 404, `entry not found: ${slug}`);

    const hash = createHash("sha1").update(post.content).digest("hex");
    const cached = this.renderCache.get(slug);
    if (cached && cached.hash === hash) return { ...toMeta(post), html: cached.html };

    const html = await this.renderer.render(post.content);
    this.renderCache.set(slug, { hash, html });
    return { ...toMeta(post), html };
  }

  async publish(dto: PublishPost): Promise<PostMeta> {
    await this.repository.upsert(dto);
    const saved = await this.repository.findBySlug(dto.slug);
    if (!saved) throw new AppException(ErrorCode.INTERNAL, 500, "saved entry not readable");
    return toMeta(saved);
  }

  async delete(slug: string): Promise<void> {
    const deleted = await this.repository.deleteBySlug(slug);
    if (!deleted) throw new AppException(ErrorCode.POST_NOT_FOUND, 404, `entry not found: ${slug}`);
    this.renderCache.delete(slug);
  }
}
