const CACHE_PREFIX = "bookmorak:aladin:";
const REVISION_KEY = "bookmorak:aladin-catalog-revision";
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

/** Drop every Aladin localStorage entry (used when the fixed catalog changes). */
export function clearAladinCache() {
  if (typeof window === "undefined") return;

  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(CACHE_PREFIX)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // ignore
  }
}

/** Clear Aladin cache once per catalog revision so ISBN list swaps take effect immediately. */
export function ensureCatalogCacheRevision(revision: string) {
  if (typeof window === "undefined") return;

  try {
    const current = window.localStorage.getItem(REVISION_KEY);
    if (current === revision) return;
    clearAladinCache();
    window.localStorage.setItem(REVISION_KEY, revision);
  } catch {
    // ignore
  }
}
