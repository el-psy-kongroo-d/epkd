import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Comments } from "./Comments";

const jsonResponse = (body: unknown) => ({ json: () => Promise.resolve(body) }) as Response;

const comment = (id: number, nickname: string, body: string) => ({
  id,
  postSlug: "first-contribution",
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
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [comment(1, "passerby", "nice write-up")] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<Comments slug="first-contribution" />);

    expect(await screen.findByText("passerby")).toBeTruthy();
    expect(screen.getByText("nice write-up")).toBeTruthy();
    expect(screen.getByText("1 comment")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("/api/posts/first-contribution/comments");
  });

  it("댓글이 0개 또는 여러 개면 'comments'로 복수형 표기한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<Comments slug="first-contribution" />);
    expect(await screen.findByText("0 comments")).toBeTruthy();
    cleanup();

    const fetchMock2 = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: [comment(1, "passerby", "a"), comment(2, "latecomer", "b")] }));
    vi.stubGlobal("fetch", fetchMock2);
    render(<Comments slug="first-contribution" />);
    expect(await screen.findByText("2 comments")).toBeTruthy();
  });

  it("작성 폼에 개인정보 안내 문구를 표시한다", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: [] })));
    render(<Comments slug="first-contribution" />);
    expect(screen.getByText(/the password is kept only as a hash for deletion/i)).toBeTruthy();
  });

  it("작성 폼 submit 시 POST payload(빈 website 포함)를 보내고 성공 후 목록을 재조회한다", async () => {
    const fetchMock = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
      if (!init) return Promise.resolve(jsonResponse({ data: [] }));
      return Promise.resolve(
        jsonResponse({
          data: {
            id: 2,
            postSlug: "first-contribution",
            nickname: "latecomer",
            body: "saved me an afternoon",
            createdAt: "2026-07-20T03:05:00.000Z",
          },
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Comments slug="first-contribution" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/posts/first-contribution/comments"));

    fireEvent.change(screen.getByPlaceholderText("nickname"), { target: { value: "latecomer" } });
    fireEvent.change(screen.getByPlaceholderText("password"), { target: { value: "sample-pass1" } });
    fireEvent.change(screen.getByPlaceholderText("write a comment…"), { target: { value: "saved me an afternoon" } });
    fireEvent.click(screen.getByRole("button", { name: /post comment/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/posts/first-contribution/comments",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            nickname: "latecomer",
            password: "sample-pass1",
            body: "saved me an afternoon",
            website: "",
          }),
        }),
      ),
    );

    const getCalls = fetchMock.mock.calls.filter(([, init]) => !init);
    await waitFor(() => expect(getCalls.length).toBeGreaterThanOrEqual(2));

    expect((screen.getByPlaceholderText("nickname") as HTMLInputElement).value).toBe("");
  });

  it("delete를 누르면 인라인 비밀번호 폼이 열리고, confirm 시 DELETE를 보낸다", async () => {
    const fetchMock = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
      if (init?.method === "DELETE") return Promise.resolve(jsonResponse({ data: null }));
      return Promise.resolve(jsonResponse({ data: [comment(1, "passerby", "nice write-up")] }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Comments slug="first-contribution" />);
    fireEvent.click(await screen.findByRole("button", { name: /delete/i }));

    const passwordInput = screen.getByLabelText(/password for this comment/i);
    fireEvent.change(passwordInput, { target: { value: "sample-pass1" } });
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/comments/1",
        expect.objectContaining({ method: "DELETE", body: JSON.stringify({ password: "sample-pass1" }) }),
      ),
    );
    await waitFor(() => expect(screen.queryByLabelText(/password for this comment/i)).toBeNull());
  });

  it("cancel을 누르면 삭제 폼이 닫힌다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ data: [comment(1, "passerby", "nice write-up")] })),
    );

    render(<Comments slug="first-contribution" />);
    fireEvent.click(await screen.findByRole("button", { name: /delete/i }));
    expect(screen.getByLabelText(/password for this comment/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByLabelText(/password for this comment/i)).toBeNull();
  });
});
