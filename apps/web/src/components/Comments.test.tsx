import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Comments } from "./Comments";

const jsonResponse = (body: unknown) => ({ json: () => Promise.resolve(body) }) as Response;

const comment = (id: number, nickname: string, body: string) => ({
  id,
  postSlug: "steins-gate",
  nickname,
  body,
  createdAt: "2026-07-20T03:04:00.000Z",
});

describe("Comments", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it("목록을 렌더링한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [comment(1, "rintarou", "el psy kongroo")] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<Comments slug="steins-gate" />);

    expect(await screen.findByText("rintarou")).toBeTruthy();
    expect(screen.getByText("el psy kongroo")).toBeTruthy();
    expect(screen.getByText("1 comment")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("/api/posts/steins-gate/comments");
  });

  it("댓글이 0개 또는 여러 개면 'comments'로 복수형 표기한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<Comments slug="steins-gate" />);
    expect(await screen.findByText("0 comments")).toBeTruthy();
    cleanup();

    const fetchMock2 = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ data: [comment(1, "rintarou", "a"), comment(2, "kurisu", "b")] }),
      );
    vi.stubGlobal("fetch", fetchMock2);
    render(<Comments slug="steins-gate" />);
    expect(await screen.findByText("2 comments")).toBeTruthy();
  });

  it("작성 폼에 개인정보 안내 문구를 표시한다", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: [] })));
    render(<Comments slug="steins-gate" />);
    expect(
      screen.getByText(/the password is kept only as a hash for deletion/i),
    ).toBeTruthy();
  });

  it("작성 폼 submit 시 POST payload(빈 website 포함)를 보내고 성공 후 목록을 재조회한다", async () => {
    const fetchMock = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
      if (!init) return Promise.resolve(jsonResponse({ data: [] }));
      return Promise.resolve(jsonResponse({ data: { id: 2, postSlug: "steins-gate", nickname: "kurisu", body: "tuturu", createdAt: "2026-07-20T03:05:00.000Z" } }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Comments slug="steins-gate" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/posts/steins-gate/comments"));

    fireEvent.change(screen.getByPlaceholderText("nickname"), { target: { value: "kurisu" } });
    fireEvent.change(screen.getByPlaceholderText("password"), { target: { value: "hunchentoot1" } });
    fireEvent.change(screen.getByPlaceholderText("write a comment…"), { target: { value: "tuturu" } });
    fireEvent.click(screen.getByRole("button", { name: /post comment/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/posts/steins-gate/comments",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ nickname: "kurisu", password: "hunchentoot1", body: "tuturu", website: "" }),
        }),
      ),
    );

    const getCalls = fetchMock.mock.calls.filter(([, init]) => !init);
    await waitFor(() => expect(getCalls.length).toBeGreaterThanOrEqual(2));

    expect((screen.getByPlaceholderText("nickname") as HTMLInputElement).value).toBe("");
  });
});
