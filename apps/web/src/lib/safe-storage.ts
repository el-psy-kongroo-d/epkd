type StorageKind = "local" | "session";

function resolve(kind: StorageKind): Storage | null {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function storageGet(kind: StorageKind, key: string): string | null {
  try {
    return resolve(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function storageSet(kind: StorageKind, key: string, value: string): void {
  try {
    resolve(kind)?.setItem(key, value);
  } catch {}
}
