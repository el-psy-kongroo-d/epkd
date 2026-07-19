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
    this.rows.set(post.slug, { slug: post.slug, title: post.title, date: post.date, content: post.content });
  }

  async deleteBySlug(slug: string): Promise<boolean> {
    return this.rows.delete(slug);
  }
}
