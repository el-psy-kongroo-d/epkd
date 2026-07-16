import { describe, expect, it } from "vitest";
import { PostMetaSchema, PublishPostSchema, SLUG_REGEX } from "./post";

describe("SLUG_REGEX", () => {
  it("허용: 소문자-숫자-하이픈", () => {
    expect(SLUG_REGEX.test("building-a-blog-1")).toBe(true);
  });
  it.each(["../etc", "UPPER", "under_score", "-lead", "trail-", "a..b", ""])(
    "차단: %s",
    (bad) => expect(SLUG_REGEX.test(bad)).toBe(false),
  );
});

describe("PostMetaSchema", () => {
  const valid = { no: 1, slug: "hello-world", title: "t", date: "2026-07-28", readingMinutes: 3, excerpt: "e" };
  it("유효 메타 통과", () => expect(PostMetaSchema.parse(valid)).toEqual(valid));
  it("날짜 형식 불일치 거부", () =>
    expect(PostMetaSchema.safeParse({ ...valid, date: "07/28/2026" }).success).toBe(false));
});

describe("PublishPostSchema", () => {
  it("본문 200k 초과 거부", () =>
    expect(
      PublishPostSchema.safeParse({ slug: "a", title: "t", date: "2026-07-28", content: "x".repeat(200_001) }).success,
    ).toBe(false));
});
