import { deriveRawPosts, type PostInput, type RawPost } from "./post-derive";
import type { PublishPostInput } from "./posts.repository";

export class InMemoryPostsRepository {
  private rows = new Map<string, PostInput>();

  seed(posts: PostInput[]): void {
    for (const p of posts) this.rows.set(p.slug, p);
  }

  async loadAll(): Promise<RawPost[]> {
    return deriveRawPosts([...this.rows.values()]);
  }

  async findBySlug(slug: string): Promise<RawPost | null> {
    const all = await this.loadAll();
    return all.find((p) => p.slug === slug) ?? null;
  }

  async upsert(post: PublishPostInput): Promise<void> {
    const views = this.rows.get(post.slug)?.views ?? 0;
    this.rows.set(post.slug, { slug: post.slug, title: post.title, date: post.date, content: post.content, views });
  }

  async deleteBySlug(slug: string): Promise<boolean> {
    return this.rows.delete(slug);
  }

  async incrementViews(slug: string): Promise<void> {
    const row = this.rows.get(slug);
    if (row) row.views = (row.views ?? 0) + 1;
  }
}
