import { describe, expect, it, vi } from "vitest";
import type { MarkdownRenderer } from "./markdown.renderer";
import type { RawPost } from "./post-derive";
import type { PostsRepository } from "./posts.repository";
import { PostsService } from "./posts.service";

const raw = (slug: string, content: string): RawPost => ({
  no: 1,
  slug,
  title: "t",
  date: "2026-07-28",
  views: 0,
  readingMinutes: 1,
  excerpt: "e",
  content,
});

function makeService(post: { current: RawPost }) {
  const render = vi.fn(async (md: string) => `<p>${md}</p>`);
  const repository = { findBySlug: async () => post.current } as unknown as PostsRepository;
  const renderer = { render } as unknown as MarkdownRenderer;
  return { service: new PostsService(repository, renderer), render };
}

describe("PostsService render cache", () => {
  it("calls the renderer only once for identical content", async () => {
    const post = { current: raw("a", "hello") };
    const { service, render } = makeService(post);
    const first = await service.get("a");
    const second = await service.get("a");
    expect(render).toHaveBeenCalledTimes(1);
    expect(second.html).toBe(first.html);
  });

  it("re-renders when content changes", async () => {
    const post = { current: raw("a", "v1") };
    const { service, render } = makeService(post);
    await service.get("a");
    post.current = raw("a", "v2");
    const updated = await service.get("a");
    expect(render).toHaveBeenCalledTimes(2);
    expect(updated.html).toBe("<p>v2</p>");
  });
});

describe("PostsService.publish", () => {
  it("returns the meta fetched via findBySlug after repository.upsert (no POST_ALREADY_EXISTS)", async () => {
    const post = { current: raw("new-entry", "hello") };
    const upsert = vi.fn(async () => undefined);
    const repository = { upsert, findBySlug: async () => post.current } as unknown as PostsRepository;
    const renderer = { render: vi.fn() } as unknown as MarkdownRenderer;
    const service = new PostsService(repository, renderer);

    const dto = { slug: "new-entry", title: "t", date: "2026-07-28", content: "hello" };
    const meta = await service.publish(dto);

    expect(upsert).toHaveBeenCalledWith(dto);
    expect(meta.slug).toBe("new-entry");
    expect(meta).not.toHaveProperty("content");
  });
});

describe("PostsService.delete", () => {
  it("deleteBySlug false → 404 POST_NOT_FOUND", async () => {
    const deleteBySlug = vi.fn(async () => false);
    const repository = { deleteBySlug } as unknown as PostsRepository;
    const renderer = {} as unknown as MarkdownRenderer;
    const service = new PostsService(repository, renderer);

    await expect(service.delete("ghost")).rejects.toMatchObject({ code: "POST_NOT_FOUND", status: 404 });
  });

  it("deleteBySlug true → completes normally", async () => {
    const deleteBySlug = vi.fn(async () => true);
    const repository = { deleteBySlug } as unknown as PostsRepository;
    const renderer = {} as unknown as MarkdownRenderer;
    const service = new PostsService(repository, renderer);

    await expect(service.delete("a")).resolves.toBeUndefined();
  });
});
