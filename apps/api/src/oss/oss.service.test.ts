import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OssService } from "./oss.service";

const searchResponse = (items: Array<{ repository_url: string }>): Response =>
  ({ ok: true, status: 200, json: () => Promise.resolve({ items }) }) as Response;

const errorResponse = (status: number): Response =>
  ({ ok: false, status, json: () => Promise.resolve({}) }) as Response;

describe("OssService", () => {
  let service: OssService;

  beforeEach(() => {
    service = new OssService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("extracts fullName from search items' repository_url, aggregates PR counts, and sorts by fullName", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        searchResponse([
          { repository_url: "https://api.github.com/repos/nestjs/nest" },
          { repository_url: "https://api.github.com/repos/nestjs/nest" },
          { repository_url: "https://api.github.com/repos/vitejs/vite" },
        ]),
      );

    const repos = await service.getRepos();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("search/issues");
    expect((init?.headers as Record<string, string>)?.Accept).toBe("application/vnd.github+json");
    expect(repos).toEqual([
      { fullName: "nestjs/nest", url: "https://github.com/nestjs/nest", prCount: 2 },
      { fullName: "vitejs/vite", url: "https://github.com/vitejs/vite", prCount: 1 },
    ]);
  });

  it("returns the cache without refetching when called again within 6 hours", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(searchResponse([{ repository_url: "https://api.github.com/repos/nestjs/nest" }]));

    const first = await service.getRepos();
    vi.advanceTimersByTime(5 * 60 * 60 * 1000);
    const second = await service.getRepos();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it("refills the cache after 6 hours", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(searchResponse([{ repository_url: "https://api.github.com/repos/nestjs/nest" }]));

    await service.getRepos();
    vi.advanceTimersByTime(6 * 60 * 60 * 1000 + 1);
    await service.getRepos();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns an empty array when fetch throws and there is no cache (never 500)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));

    await expect(service.getRepos()).resolves.toEqual([]);
  });

  it("returns an empty array on non-200 responses (including 403 rate limit) with no cache", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(errorResponse(403));

    await expect(service.getRepos()).resolves.toEqual([]);
  });

  it("returns the stale cache when the refetch after TTL expiry fails", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(searchResponse([{ repository_url: "https://api.github.com/repos/nestjs/nest" }]))
      .mockResolvedValueOnce(errorResponse(403));

    const first = await service.getRepos();
    vi.advanceTimersByTime(6 * 60 * 60 * 1000 + 1);
    const second = await service.getRepos();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(second).toEqual(first);
    expect(second).not.toEqual([]);
  });
});
