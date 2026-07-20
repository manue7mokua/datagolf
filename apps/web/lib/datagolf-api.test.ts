import assert from "node:assert/strict";

import {
  DatagolfApiError,
  getChallenge,
  getDatagolfApiBaseUrl,
  getDatagolfApiErrorMessage,
} from "./datagolf-api";

const originalApiBaseUrl = process.env.NEXT_PUBLIC_DATAGOLF_API_URL;

delete process.env.NEXT_PUBLIC_DATAGOLF_API_URL;
assert.equal(getDatagolfApiBaseUrl(), "http://localhost:8000");

process.env.NEXT_PUBLIC_DATAGOLF_API_URL = "   ";
assert.equal(getDatagolfApiBaseUrl(), "http://localhost:8000");

process.env.NEXT_PUBLIC_DATAGOLF_API_URL = " https://api.example.test/// ";
assert.equal(getDatagolfApiBaseUrl(), "https://api.example.test");

if (originalApiBaseUrl === undefined) {
  delete process.env.NEXT_PUBLIC_DATAGOLF_API_URL;
} else {
  process.env.NEXT_PUBLIC_DATAGOLF_API_URL = originalApiBaseUrl;
}

assert.equal(
  getDatagolfApiErrorMessage(422, {
    detail: " selected_option must be one of: A, B ",
  }),
  "selected_option must be one of: A, B",
);
assert.equal(
  getDatagolfApiErrorMessage(500, { error: "Internal error" }),
  "Datagolf API request failed with 500",
);
assert.equal(
  getDatagolfApiErrorMessage(422, {
    detail: [
      {
        loc: ["query", "limit"],
        msg: "Input should be less than or equal to 100",
      },
    ],
  }),
  "query.limit: Input should be less than or equal to 100",
);
assert.equal(
  getDatagolfApiErrorMessage(422, {
    detail: [
      {
        loc: ["body", "blanks", 1],
        msg: "Input should be a valid string",
      },
      {
        loc: ["body", "session_id"],
        msg: "Field required",
      },
    ],
  }),
  "body.blanks.1: Input should be a valid string; body.session_id: Field required",
);

const originalFetch = globalThis.fetch;

runApiErrorRequestTests().catch((error) => {
  throw error;
});

async function runApiErrorRequestTests() {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ detail: "expected 2 blanks for fill-in-the-blank attempts" }),
      {
        status: 422,
        headers: { "Content-Type": "application/json" },
      },
    );

  try {
    await getChallenge("tiktok-creator-posts");
    assert.fail("Expected getChallenge to throw");
  } catch (error) {
    assert.ok(error instanceof DatagolfApiError);
    assert.equal(error.status, 422);
    assert.equal(
      error.message,
      "expected 2 blanks for fill-in-the-blank attempts",
    );
    assert.deepEqual(error.payload, {
      detail: "expected 2 blanks for fill-in-the-blank attempts",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  const networkError = new TypeError("fetch failed");
  globalThis.fetch = async () => {
    throw networkError;
  };

  try {
    await getChallenge("tiktok-creator-posts");
    assert.fail("Expected getChallenge to throw");
  } catch (error) {
    assert.ok(error instanceof DatagolfApiError);
    assert.equal(error.status, 0);
    assert.equal(error.message, "Could not reach Datagolf API");
    assert.equal(error.payload, networkError);
  } finally {
    globalThis.fetch = originalFetch;
  }
}
