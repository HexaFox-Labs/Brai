const LEGACY_PREFIX = "bright_os_";
const BRAI_PREFIX = "brai_";

export function getBraiLocalStorageItem(key: string): string | null {
  const current = window.localStorage.getItem(key);
  if (current !== null) return current;

  const legacyKey = toLegacyStorageKey(key);
  if (!legacyKey) return null;

  const legacy = window.localStorage.getItem(legacyKey);
  if (legacy === null) return null;
  try {
    window.localStorage.setItem(key, legacy);
    window.localStorage.removeItem(legacyKey);
  } catch {
    // localStorage can be unavailable in constrained WebViews.
  }
  return legacy;
}

export function setBraiLocalStorageItem(key: string, value: string): void {
  window.localStorage.setItem(key, value);
  const legacyKey = toLegacyStorageKey(key);
  if (legacyKey) window.localStorage.removeItem(legacyKey);
}

export function removeBraiLocalStorageItem(key: string): void {
  window.localStorage.removeItem(key);
  const legacyKey = toLegacyStorageKey(key);
  if (legacyKey) window.localStorage.removeItem(legacyKey);
}

export function migrateBraiLocalStoragePrefix(prefix: string): void {
  const legacyPrefix = toLegacyStorageKey(prefix);
  if (!legacyPrefix) return;

  const migrations: Array<[string, string]> = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(legacyPrefix)) continue;
    migrations.push([key, `${prefix}${key.slice(legacyPrefix.length)}`]);
  }

  for (const [legacyKey, key] of migrations) {
    const legacy = window.localStorage.getItem(legacyKey);
    if (legacy !== null && window.localStorage.getItem(key) === null) {
      window.localStorage.setItem(key, legacy);
    }
    window.localStorage.removeItem(legacyKey);
  }
}

function toLegacyStorageKey(key: string): string | null {
  return key.startsWith(BRAI_PREFIX) ? `${LEGACY_PREFIX}${key.slice(BRAI_PREFIX.length)}` : null;
}
