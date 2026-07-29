import { z } from "zod";

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const PostMetaSchema = z.object({
  no: z.number().int().positive(),
  slug: z.string().regex(SLUG_REGEX),
  title: z.string().min(1),
  date: z.string().regex(DATE_REGEX),
  readingMinutes: z.number().int().positive(),
  excerpt: z.string(),
  views: z.number().int().nonnegative(),
});

export const SiteStatsSchema = z.object({
  totalVisits: z.number().int().nonnegative(),
});
export type SiteStats = z.infer<typeof SiteStatsSchema>;
export type PostMeta = z.infer<typeof PostMetaSchema>;

export const PostDetailSchema = PostMetaSchema.extend({ html: z.string() });
export type PostDetail = z.infer<typeof PostDetailSchema>;

export const PublishPostSchema = z.object({
  slug: z.string().max(80).regex(SLUG_REGEX),
  title: z.string().min(1).max(200),
  date: z.string().regex(DATE_REGEX),
  content: z.string().min(1).max(200_000),
});
export type PublishPost = z.infer<typeof PublishPostSchema>;
