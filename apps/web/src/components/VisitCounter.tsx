import { useEffect, useRef, useState } from "react";
import { storageGet, storageSet } from "../lib/safe-storage";

const VISIT_KEY = "epkd-visit-day";
const DIGITS = 6;
const ROLL_MS = 1400;

function pad(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(DIGITS, "0");
}

function prefersReducedMotion(): boolean {
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function VisitCounter() {
  const [total, setTotal] = useState<number | null>(null);
  const [shown, setShown] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const counted = storageGet("local", VISIT_KEY) === today;
    const request = counted ? fetch("/api/stats") : fetch("/api/visit", { method: "POST" });
    request
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const visits = json?.data?.totalVisits;
        if (typeof visits !== "number") return;
        setTotal(visits);
        storageSet("local", VISIT_KEY, today);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (total === null) return;
    if (prefersReducedMotion()) {
      setShown(total);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ROLL_MS);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(total * eased));
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [total]);

  if (total === null) return null;

  const current = pad(shown);
  const settled = pad(total);

  return (
    <span className="visit-counter">
      <span className="visit-label">visitors</span>
      <span className="sr-only">{total.toLocaleString()}</span>
      <span className="tubes" aria-hidden="true">
        {current.split("").map((d, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-width digit positions
          <span key={i} className={`tube${d !== settled[i] ? " rolling" : ""}`} aria-hidden="true">
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}
