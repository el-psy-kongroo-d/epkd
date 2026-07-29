import { useEffect, useState } from "react";
import { storageGet, storageSet } from "../lib/safe-storage";

const VISIT_KEY = "epkd-visit-day";

export function VisitCounter() {
  const [total, setTotal] = useState<number | null>(null);

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

  if (total === null) return null;
  return <span className="visit-counter">visitors {String(total).padStart(6, "0")}</span>;
}
