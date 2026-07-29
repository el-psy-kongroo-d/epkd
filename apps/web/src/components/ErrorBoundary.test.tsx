import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

function Bomb(): never {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it("자식이 던지면 폴백을 렌더링한다", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/something went wrong/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "go home" }).getAttribute("href")).toBe("/");
  });

  it("정상 자식은 그대로 렌더링한다", () => {
    render(
      <ErrorBoundary>
        <span>fine</span>
      </ErrorBoundary>,
    );
    expect(screen.getByText("fine")).toBeTruthy();
  });
});
