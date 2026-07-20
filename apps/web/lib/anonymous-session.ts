const sessionStorageKey = "datagolf.anonymous_session_id";
let fallbackSessionId: string | null = null;

export function getAnonymousSessionId() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const existing = window.localStorage.getItem(sessionStorageKey);
    const storedSessionId = existing?.trim();
    if (storedSessionId) {
      if (storedSessionId !== existing) {
        window.localStorage.setItem(sessionStorageKey, storedSessionId);
      }
      fallbackSessionId = storedSessionId;
      return storedSessionId;
    }

    const sessionId = createSessionId();
    window.localStorage.setItem(sessionStorageKey, sessionId);
    fallbackSessionId = sessionId;
    return sessionId;
  } catch {
    fallbackSessionId = fallbackSessionId ?? createSessionId();
    return fallbackSessionId;
  }
}

export function resetAnonymousSessionId() {
  if (typeof window === "undefined") {
    return null;
  }

  const sessionId = createSessionId();
  fallbackSessionId = sessionId;

  try {
    window.localStorage.setItem(sessionStorageKey, sessionId);
  } catch {
    return sessionId;
  }

  return sessionId;
}

function createSessionId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `anon_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
