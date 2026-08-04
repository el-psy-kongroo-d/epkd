import { describe, expect, it } from "vitest";
import { deriveRawPosts, normalizeDate, toExcerpt, toReadingMinutes } from "./post-derive";

describe("normalizeDate", () => {
  it("passes YYYY-MM-DD strings through as-is", () => {
    expect(normalizeDate("2026-07-05")).toBe("2026-07-05");
  });

  it("normalizes Date objects to YYYY-MM-DD", () => {
    expect(normalizeDate(new Date(Date.UTC(2026, 6, 5)))).toBe("2026-07-05");
  });

  it("null for malformed strings/invalid values", () => {
    expect(normalizeDate("07/28/2026")).toBeNull();
    expect(normalizeDate(undefined)).toBeNull();
    expect(normalizeDate(new Date(Number.NaN))).toBeNull();
  });
});

describe("toReadingMinutes", () => {
  it("200 words/minute, minimum 1 minute", () => {
    expect(toReadingMinutes("word")).toBe(1);
    expect(toReadingMinutes(Array(450).fill("word").join(" "))).toBe(2);
  });
});

describe("toExcerpt", () => {
  it("truncates to 160 chars and appends an ellipsis", () => {
    const long = Array(60).fill("word").join(" ");
    const excerpt = toExcerpt(long);
    expect(excerpt.length).toBeLessThanOrEqual(160);
    expect(excerpt.endsWith("…")).toBe(true);
  });

  it("preserves intra-word hyphens/underscores, strips leading markdown markers", () => {
    const excerpt = toExcerpt("# Title\n\n- contact me via e-mail at foo_bar@example.com");
    expect(excerpt).toContain("e-mail");
    expect(excerpt).toContain("foo_bar");
    expect(excerpt.startsWith("Title")).toBe(true);
  });
});

describe("deriveRawPosts", () => {
  it("sorts by date ascending + numbers from 1", () => {
    const posts = deriveRawPosts([
      { slug: "newer", title: "Newer", date: "2026-07-27", content: "hello world" },
      { slug: "older", title: "Older", date: "2026-07-01", content: "hi" },
    ]);
    expect(posts.map((p) => [p.no, p.slug])).toEqual([
      [1, "older"],
      [2, "newer"],
    ]);
  });

  it("tie-breaks equal dates by slug asc", () => {
    const posts = deriveRawPosts([
      { slug: "b", title: "B", date: "2026-07-01", content: "x" },
      { slug: "a", title: "A", date: "2026-07-01", content: "y" },
    ]);
    expect(posts.map((p) => p.slug)).toEqual(["a", "b"]);
  });

  it("derives and fills readingMinutes/excerpt", () => {
    const [post] = deriveRawPosts([
      { slug: "long", title: "L", date: "2026-07-01", content: Array(450).fill("word").join(" ") },
    ]);
    expect(post.readingMinutes).toBe(2);
    expect(post.excerpt.length).toBeGreaterThan(0);
    expect(post.excerpt.length).toBeLessThanOrEqual(160);
  });
});
