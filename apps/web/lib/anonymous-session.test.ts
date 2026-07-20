import assert from "node:assert/strict";

import {
  getAnonymousSessionId,
  resetAnonymousSessionId,
} from "./anonymous-session";

const sessionStorageKey = "datagolf.anonymous_session_id";

assert.equal(getAnonymousSessionId(), null);
assert.equal(resetAnonymousSessionId(), null);

const storage = createStorageMock();
setWindowStorage(storage);

const firstSessionId = getAnonymousSessionId();
assert.equal(typeof firstSessionId, "string");
assert.equal(storage.getItem(sessionStorageKey), firstSessionId);
assert.equal(getAnonymousSessionId(), firstSessionId);

const resetSessionId = resetAnonymousSessionId();
assert.equal(typeof resetSessionId, "string");
assert.notEqual(resetSessionId, firstSessionId);
assert.equal(storage.getItem(sessionStorageKey), resetSessionId);

setWindowStorage(createThrowingStorageMock());

const fallbackSessionId = getAnonymousSessionId();
assert.equal(typeof fallbackSessionId, "string");
assert.equal(getAnonymousSessionId(), fallbackSessionId);

const resetFallbackSessionId = resetAnonymousSessionId();
assert.equal(typeof resetFallbackSessionId, "string");
assert.notEqual(resetFallbackSessionId, fallbackSessionId);
assert.equal(getAnonymousSessionId(), resetFallbackSessionId);

function setWindowStorage(localStorage: Storage) {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage },
  });
}

function createStorageMock(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

function createThrowingStorageMock(): Storage {
  return {
    get length(): number {
      throw new Error("Storage unavailable");
    },
    clear() {
      throw new Error("Storage unavailable");
    },
    getItem() {
      throw new Error("Storage unavailable");
    },
    key() {
      throw new Error("Storage unavailable");
    },
    removeItem() {
      throw new Error("Storage unavailable");
    },
    setItem() {
      throw new Error("Storage unavailable");
    },
  };
}
