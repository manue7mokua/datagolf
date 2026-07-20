const sessionStorageKey = "datagolf.anonymous_session_id";

export function getAnonymousSessionId() {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = window.localStorage.getItem(sessionStorageKey);
  if (existing) {
    return existing;
  }

  const sessionId = createSessionId();
  window.localStorage.setItem(sessionStorageKey, sessionId);
  return sessionId;
}

export function resetAnonymousSessionId() {
  if (typeof window === "undefined") {
    return null;
  }

  const sessionId = createSessionId();
  window.localStorage.setItem(sessionStorageKey, sessionId);
  return sessionId;
}

function createSessionId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `anon_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
