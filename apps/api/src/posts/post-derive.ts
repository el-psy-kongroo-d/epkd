export interface RawPost {
  no: number;
  slug: string;
  title: string;
  date: string;
  readingMinutes: number;
  excerpt: string;
  content: string;
  views: number;
}

export interface PostInput {
  slug: string;
  title: string;
  date: string;
  content: string;
  views?: number;
}

const WORDS_PER_MINUTE = 200;
const EXCERPT_MAX = 160;

export function normalizeDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return null;
}

export function toExcerpt(content: string): string {
  const plain = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/^[\s>*#-]+/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length <= EXCERPT_MAX ? plain : `${plain.slice(0, EXCERPT_MAX - 1).trimEnd()}…`;
}

export function toReadingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function deriveRawPosts(inputs: PostInput[]): RawPost[] {
  const withDerived = inputs.map((p) => ({
    slug: p.slug,
    title: p.title,
    date: p.date,
    content: p.content,
    views: p.views ?? 0,
    readingMinutes: toReadingMinutes(p.content),
    excerpt: toExcerpt(p.content),
  }));
  withDerived.sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : a.date.localeCompare(b.date)));
  return withDerived.map((p, i) => ({ ...p, no: i + 1 }));
}
