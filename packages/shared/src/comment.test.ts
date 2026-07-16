import { describe, expect, it } from "vitest";
import { CommentSchema, CreateCommentSchema, DeleteCommentSchema } from "./comment";

describe("CreateCommentSchema — 허니팟(website)", () => {
  const base = { nickname: "n", password: "pass", body: "b" };

  it("website에 값이 있으면 거부", () => {
    expect(CreateCommentSchema.safeParse({ ...base, website: "http://spam" }).success).toBe(false);
  });

  it("website가 빈 문자열이면 통과", () => {
    expect(CreateCommentSchema.safeParse({ ...base, website: "" }).success).toBe(true);
  });

  it("website가 없으면 통과", () => {
    expect(CreateCommentSchema.safeParse({ ...base }).success).toBe(true);
  });
});

describe("CreateCommentSchema — 필드 검증", () => {
  const base = { nickname: "n", password: "pass", body: "b" };

  it("닉네임 25자 거부", () => {
    expect(CreateCommentSchema.safeParse({ ...base, nickname: "a".repeat(25) }).success).toBe(false);
  });

  it("닉네임 24자 통과", () => {
    expect(CreateCommentSchema.safeParse({ ...base, nickname: "a".repeat(24) }).success).toBe(true);
  });

  it("본문 1001자 거부", () => {
    expect(CreateCommentSchema.safeParse({ ...base, body: "a".repeat(1001) }).success).toBe(false);
  });

  it("본문 1000자 통과", () => {
    expect(CreateCommentSchema.safeParse({ ...base, body: "a".repeat(1000) }).success).toBe(true);
  });

  it("비밀번호 3자 거부", () => {
    expect(CreateCommentSchema.safeParse({ ...base, password: "abc" }).success).toBe(false);
  });

  it("정상 payload 통과", () => {
    const valid = { nickname: "nick", password: "1234", body: "hello" };
    expect(CreateCommentSchema.safeParse(valid).success).toBe(true);
  });

  it("nickname/body 공백 trim 후 검증", () => {
    expect(CreateCommentSchema.safeParse({ ...base, nickname: "   " }).success).toBe(false);
  });
});

describe("DeleteCommentSchema", () => {
  it("정상 password 통과", () => expect(DeleteCommentSchema.safeParse({ password: "1234" }).success).toBe(true));
  it("짧은 password 거부", () => expect(DeleteCommentSchema.safeParse({ password: "123" }).success).toBe(false));
});

describe("CommentSchema — roundtrip", () => {
  it("유효 댓글 통과", () => {
    const valid = {
      id: 1,
      postSlug: "hello-world",
      nickname: "nick",
      body: "hello",
      createdAt: "2026-07-29T00:00:00.000Z",
    };
    expect(CommentSchema.parse(valid)).toEqual(valid);
  });

  it("postSlug 형식 위반 거부", () => {
    const invalid = {
      id: 1,
      postSlug: "UPPER_CASE",
      nickname: "nick",
      body: "hello",
      createdAt: "2026-07-29T00:00:00.000Z",
    };
    expect(CommentSchema.safeParse(invalid).success).toBe(false);
  });
});
