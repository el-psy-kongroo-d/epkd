import { Injectable, Logger } from "@nestjs/common";
import { ErrorCode, SLUG_REGEX } from "@epkd/shared";
import { AppException } from "../common/app.exception";
import { SupabaseService } from "../supabase/supabase.service";
import { deriveRawPosts, normalizeDate, type PostInput, type RawPost } from "./post-derive";
import { PostsRepository, type PublishPostInput } from "./posts.repository";

interface PostRow {
  slug: string;
  title: string;
  date: string;
  content: string;
  updated_at: string;
}

const INTERNAL_ERROR_MESSAGE = "internal error";
const CACHE_TTL_MS = 30_000;

@Injectable()
export class SupabasePostsRepository extends PostsRepository {
  private readonly logger = new Logger(SupabasePostsRepository.name);
  private cache: { posts: RawPost[]; expiresAt: number } | null = null;
  private generation = 0;
  private inFlight: Promise<RawPost[]> | null = null;

  constructor(private readonly supabase: SupabaseService) {
    super();
  }

  private fail(context: string, message: string): never {
    this.logger.error(`${context}: ${message}`);
    throw new AppException(ErrorCode.INTERNAL, 500, INTERNAL_ERROR_MESSAGE);
  }

  private invalidate(): void {
    this.generation++;
    this.cache = null;
  }

  async loadAll(): Promise<RawPost[]> {
    if (this.cache && this.cache.expiresAt > Date.now()) return this.cache.posts;
    if (!this.inFlight) {
      const gen = this.generation;
      this.inFlight = this.fetchAll(gen).finally(() => {
        this.inFlight = null;
      });
    }
    return this.inFlight;
  }

  private async fetchAll(gen: number): Promise<RawPost[]> {
    const { data, error } = await this.supabase.client.from("posts").select("*");
    if (error) this.fail("loadAll", error.message);

    const rows = (data ?? []) as PostRow[];
    const inputs: PostInput[] = [];
    for (const row of rows) {
      if (!SLUG_REGEX.test(row.slug)) {
        this.logger.warn(`skip (bad slug): ${row.slug}`);
        continue;
      }
      const title = typeof row.title === "string" && row.title.trim() ? row.title.trim() : null;
      const date = normalizeDate(row.date);
      if (!title || !date) {
        this.logger.warn(`skip (bad row): ${row.slug}`);
        continue;
      }
      inputs.push({ slug: row.slug, title, date, content: row.content });
    }

    const posts = deriveRawPosts(inputs);
    if (gen === this.generation) this.cache = { posts, expiresAt: Date.now() + CACHE_TTL_MS };
    return posts;
  }

  async findBySlug(slug: string): Promise<RawPost | null> {
    if (!SLUG_REGEX.test(slug)) return null;
    const all = await this.loadAll();
    return all.find((p) => p.slug === slug) ?? null;
  }

  async upsert(post: PublishPostInput): Promise<void> {
    const { error } = await this.supabase.client
      .from("posts")
      .upsert({ ...post, updated_at: new Date().toISOString() });
    if (error) this.fail("upsert", error.message);
    this.invalidate();
  }

  async deleteBySlug(slug: string): Promise<boolean> {
    const { data, error } = await this.supabase.client.from("posts").delete().eq("slug", slug).select();
    if (error) this.fail("deleteBySlug", error.message);
    this.invalidate();
    return (data?.length ?? 0) > 0;
  }
}
