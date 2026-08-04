import { describe, expect, it } from "vitest";
import { PostMetaSchema, PublishPostSchema, SLUG_REGEX } from "./post";

describe("SLUG_REGEX", () => {
  it("accepts: lowercase-digits-hyphens", () => {
    expect(SLUG_REGEX.test("building-a-blog-1")).toBe(true);
  });
  it.each(["../etc", "UPPER", "under_score", "-lead", "trail-", "a..b", ""])("blocks: %s", (bad) =>
    expect(SLUG_REGEX.test(bad)).toBe(false),
  );
});

describe("PostMetaSchema", () => {
  const valid = {
    no: 1,
    slug: "hello-world",
    title: "t",
    date: "2026-07-28",
    readingMinutes: 3,
    excerpt: "e",
    views: 0,
  };
  it("accepts valid meta", () => expect(PostMetaSchema.parse(valid)).toEqual(valid));
  it("rejects malformed date", () =>
    expect(PostMetaSchema.safeParse({ ...valid, date: "07/28/2026" }).success).toBe(false));
});

describe("PublishPostSchema", () => {
  it("rejects body over 200k", () =>
    expect(
      PublishPostSchema.safeParse({ slug: "a", title: "t", date: "2026-07-28", content: "x".repeat(200_001) }).success,
    ).toBe(false));
});
