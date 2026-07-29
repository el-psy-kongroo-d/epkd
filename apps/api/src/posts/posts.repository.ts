import type { RawPost } from "./post-derive";

export interface PublishPostInput {
  slug: string;
  title: string;
  date: string;
  content: string;
}

export abstract class PostsRepository {
  abstract loadAll(): Promise<RawPost[]>;
  abstract findBySlug(slug: string): Promise<RawPost | null>;
  abstract upsert(post: PublishPostInput): Promise<void>;
  abstract deleteBySlug(slug: string): Promise<boolean>;
  abstract incrementViews(slug: string): Promise<void>;
}
