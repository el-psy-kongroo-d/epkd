import { describe, expect, it } from "vitest";
import { deriveRawPosts, normalizeDate, toExcerpt, toReadingMinutes } from "./post-derive";

describe("normalizeDate", () => {
  it("YYYY-MM-DD 문자열은 그대로 통과", () => {
    expect(normalizeDate("2026-07-05")).toBe("2026-07-05");
  });

  it("Date 객체는 YYYY-MM-DD로 정규화", () => {
    expect(normalizeDate(new Date(Date.UTC(2026, 6, 5)))).toBe("2026-07-05");
  });

  it("형식이 다른 문자열/유효하지 않은 값은 null", () => {
    expect(normalizeDate("07/28/2026")).toBeNull();
    expect(normalizeDate(undefined)).toBeNull();
    expect(normalizeDate(new Date(Number.NaN))).toBeNull();
  });
});

describe("toReadingMinutes", () => {
  it("200단어/분, 최소 1분", () => {
    expect(toReadingMinutes("word")).toBe(1);
    expect(toReadingMinutes(Array(450).fill("word").join(" "))).toBe(2);
  });
});

describe("toExcerpt", () => {
  it("160자 이내로 자르고 말줄임표를 붙인다", () => {
    const long = Array(60).fill("word").join(" ");
    const excerpt = toExcerpt(long);
    expect(excerpt.length).toBeLessThanOrEqual(160);
    expect(excerpt.endsWith("…")).toBe(true);
  });

  it("단어 내부 하이픈/언더스코어는 보존, 줄 앞 마크다운 마커는 제거", () => {
    const excerpt = toExcerpt("# Title\n\n- contact me via e-mail at foo_bar@example.com");
    expect(excerpt).toContain("e-mail");
    expect(excerpt).toContain("foo_bar");
    expect(excerpt.startsWith("Title")).toBe(true);
  });
});

describe("deriveRawPosts", () => {
  it("date 오름차순 정렬 + 1부터 번호", () => {
    const posts = deriveRawPosts([
      { slug: "newer", title: "Newer", date: "2026-07-27", content: "hello world" },
      { slug: "older", title: "Older", date: "2026-07-01", content: "hi" },
    ]);
    expect(posts.map((p) => [p.no, p.slug])).toEqual([
      [1, "older"],
      [2, "newer"],
    ]);
  });

  it("같은 날짜는 slug asc로 tie-break", () => {
    const posts = deriveRawPosts([
      { slug: "b", title: "B", date: "2026-07-01", content: "x" },
      { slug: "a", title: "A", date: "2026-07-01", content: "y" },
    ]);
    expect(posts.map((p) => p.slug)).toEqual(["a", "b"]);
  });

  it("readingMinutes/excerpt를 파생시켜 채운다", () => {
    const [post] = deriveRawPosts([
      { slug: "long", title: "L", date: "2026-07-01", content: Array(450).fill("word").join(" ") },
    ]);
    expect(post.readingMinutes).toBe(2);
    expect(post.excerpt.length).toBeGreaterThan(0);
    expect(post.excerpt.length).toBeLessThanOrEqual(160);
  });
});
