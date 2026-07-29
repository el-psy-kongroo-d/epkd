import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Home } from "./Home";

const meta = (no: number, slug: string, title: string) => ({
  no,
  slug,
  title,
  date: "2026-07-27",
  readingMinutes: 4,
  excerpt: `excerpt of ${slug}`,
});

describe("Home", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("최신 5개만 렌더링", async () => {
    const posts = [6, 5, 4, 3, 2, 1].map((n) => meta(n, `post-${n}`, `Post ${n}`));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((path: string) => {
        const body = path === "/api/oss" ? { data: { repos: [] } } : { data: posts };
        return Promise.resolve({ json: () => Promise.resolve(body) });
      }),
    );
    render(<Home />, { wrapper: MemoryRouter });
    expect(await screen.findByText("Post 6")).toBeTruthy();
    expect(screen.queryByText("Post 1")).toBeNull();
    expect(screen.getByText("excerpt of post-6")).toBeTruthy();
  });
});
