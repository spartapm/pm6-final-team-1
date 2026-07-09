const CACHE_PREFIX = "bookmorak:aladin:";
const TTL_MS = 24 * 60 * 60 * 1000;

type CacheEntry<T> = {
  savedAt: number;
  data: T;
};

export function readAladinCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;

    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (!entry?.savedAt || Date.now() - entry.savedAt > TTL_MS) {
      window.localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

export function writeAladinCache<T>(key: string, data: T) {
  if (typeof window === "undefined") return;

  try {
    const entry: CacheEntry<T> = { savedAt: Date.now(), data };
    window.localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function aladinCacheKey(parts: Array<string | number>) {
  return parts.map(String).join(":");
}
