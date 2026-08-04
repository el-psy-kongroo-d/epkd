import { describe, expect, it } from "vitest";
import { CommentSchema, CreateCommentSchema, DeleteCommentSchema } from "./comment";

describe("CreateCommentSchema — honeypot (website)", () => {
  const base = { nickname: "n", password: "pass", body: "b" };

  it("rejects when website has a value", () => {
    expect(CreateCommentSchema.safeParse({ ...base, website: "http://spam" }).success).toBe(false);
  });

  it("passes when website is an empty string", () => {
    expect(CreateCommentSchema.safeParse({ ...base, website: "" }).success).toBe(true);
  });

  it("passes when website is absent", () => {
    expect(CreateCommentSchema.safeParse({ ...base }).success).toBe(true);
  });
});

describe("CreateCommentSchema — field validation", () => {
  const base = { nickname: "n", password: "pass", body: "b" };

  it("rejects 25-char nickname", () => {
    expect(CreateCommentSchema.safeParse({ ...base, nickname: "a".repeat(25) }).success).toBe(false);
  });

  it("accepts 24-char nickname", () => {
    expect(CreateCommentSchema.safeParse({ ...base, nickname: "a".repeat(24) }).success).toBe(true);
  });

  it("rejects 1001-char body", () => {
    expect(CreateCommentSchema.safeParse({ ...base, body: "a".repeat(1001) }).success).toBe(false);
  });

  it("accepts 1000-char body", () => {
    expect(CreateCommentSchema.safeParse({ ...base, body: "a".repeat(1000) }).success).toBe(true);
  });

  it("rejects 3-char password", () => {
    expect(CreateCommentSchema.safeParse({ ...base, password: "abc" }).success).toBe(false);
  });

  it("accepts a valid payload", () => {
    const valid = { nickname: "nick", password: "1234", body: "hello" };
    expect(CreateCommentSchema.safeParse(valid).success).toBe(true);
  });

  it("validates nickname/body after trimming whitespace", () => {
    expect(CreateCommentSchema.safeParse({ ...base, nickname: "   " }).success).toBe(false);
  });
});

describe("DeleteCommentSchema", () => {
  it("accepts a valid password", () => expect(DeleteCommentSchema.safeParse({ password: "1234" }).success).toBe(true));
  it("rejects a short password", () => expect(DeleteCommentSchema.safeParse({ password: "123" }).success).toBe(false));
});

describe("CommentSchema — roundtrip", () => {
  it("accepts a valid comment", () => {
    const valid = {
      id: 1,
      postSlug: "hello-world",
      nickname: "nick",
      body: "hello",
      createdAt: "2026-07-29T00:00:00.000Z",
    };
    expect(CommentSchema.parse(valid)).toEqual(valid);
  });

  it("rejects a postSlug format violation", () => {
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
