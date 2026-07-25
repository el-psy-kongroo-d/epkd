import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OssService } from "./oss.service";

const searchResponse = (items: Array<{ repository_url: string }>): Response =>
  ({ ok: true, status: 200, json: () => Promise.resolve({ items }) }) as Response;

const errorResponse = (status: number): Response => ({ ok: false, status, json: () => Promise.resolve({}) }) as Response;

describe("OssService", () => {
  let service: OssService;

  beforeEach(() => {
    service = new OssService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("search items의 repository_url에서 fullName을 뽑아 PR 수를 집계하고 fullName 순 정렬한다", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
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

  it("6시간 이내 재호출은 캐시를 반환하고 fetch를 다시 하지 않는다", async () => {
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

  it("6시간이 지나면 캐시를 다시 채운다", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(searchResponse([{ repository_url: "https://api.github.com/repos/nestjs/nest" }]));

    await service.getRepos();
    vi.advanceTimersByTime(6 * 60 * 60 * 1000 + 1);
    await service.getRepos();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fetch가 예외를 던지고 캐시가 없으면 빈 배열을 반환한다 (500 금지)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));

    await expect(service.getRepos()).resolves.toEqual([]);
  });

  it("non-200(403 rate limit 포함) 응답이고 캐시가 없으면 빈 배열을 반환한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(errorResponse(403));

    await expect(service.getRepos()).resolves.toEqual([]);
  });

  it("TTL 만료 후 재요청이 실패하면 스테일 캐시를 반환한다", async () => {
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
