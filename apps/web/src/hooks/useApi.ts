import { useEffect, useState } from "react";
import { ErrorCode } from "@epkd/shared";
import { ApiClientError, apiGet } from "../api/client";

export function useApi<T>(path: string): { data: T | null; error: ErrorCode | null } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ErrorCode | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    apiGet<T>(path)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof ApiClientError ? e.code : ErrorCode.INTERNAL));
    return () => {
      cancelled = true;
    };
  }, [path]);

  return { data, error };
}
