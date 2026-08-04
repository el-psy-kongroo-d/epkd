import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OssTicker } from "./OssTicker";

const jsonResponse = (body: unknown) => ({ json: () => Promise.resolve(body) }) as Response;

describe("OssTicker", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it("renders repos as owner/repo(+N) twice (seamless loop)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: { repos: [{ fullName: "nestjs/nest", url: "https://github.com/nestjs/nest", prCount: 3 }] },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<OssTicker />);

    const links = await screen.findAllByRole("link", { name: "nestjs/nest" });
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute("href")).toBe("https://github.com/nestjs/nest");
    expect(screen.getAllByText(/\+3/)).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledWith("/api/oss");
  });

  it("renders nothing when repos is empty", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { repos: [] } }));
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<OssTicker />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(container.innerHTML).toBe("");
  });
});
