import { useEffect, useRef, useState } from "react";

const FINAL = "1.048596";
const SCRAMBLE_MS = 1100;
const TICK_MS = 55;

function randomReading(): string {
  let out = "";
  for (const ch of FINAL) out += ch === "." ? "." : String(Math.floor(Math.random() * 10));
  return out;
}

export function NixieReadout() {
  const [value, setValue] = useState(FINAL);
  const timer = useRef<number | null>(null);

  const scramble = () => {
    if (typeof window.matchMedia !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (timer.current !== null) return;
    const start = performance.now();
    timer.current = window.setInterval(() => {
      if (performance.now() - start >= SCRAMBLE_MS) {
        window.clearInterval(timer.current as number);
        timer.current = null;
        setValue(FINAL);
      } else {
        setValue(randomReading());
      }
    }, TICK_MS);
  };

  useEffect(() => {
    scramble();
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
    };
  }, []);

  return (
    <span className="readout" aria-hidden="true" onMouseEnter={scramble}>
      {value}
    </span>
  );
}
