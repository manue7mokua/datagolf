import assert from "node:assert/strict";

import {
  createAttempt,
  DatagolfApiError,
  getAttempt,
  getChallenge,
  getChallengeQuestions,
  getDatasetPreview,
  getDatagolfApiBaseUrl,
  getDatagolfApiErrorMessage,
  getSessionChallengeSummary,
  listSessionAttempts,
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
  "Internal error",
);
assert.equal(
  getDatagolfApiErrorMessage(503, { message: " Service unavailable " }),
  "Service unavailable",
);
assert.equal(
  getDatagolfApiErrorMessage(502, {
    detail: { message: " Upstream service timed out " },
  }),
  "Upstream service timed out",
);
assert.equal(
  getDatagolfApiErrorMessage(500, {
    detail: { error: "Model response unavailable" },
  }),
  "Model response unavailable",
);
assert.equal(
  getDatagolfApiErrorMessage(500, { error: " " }),
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

runApiRequestTests().catch((error) => {
  throw error;
});

async function runApiRequestTests() {
  const requestedUrls: string[] = [];
  const attemptBodies: unknown[] = [];
  globalThis.fetch = async (input, init) => {
    requestedUrls.push(String(input));
    if (String(input).includes("/attempts") && init?.method === "POST") {
      attemptBodies.push(JSON.parse(String(init.body)));
    }
    return Response.json({});
  };

  try {
    await getChallenge(" creator posts/v1 ");
    await getChallengeQuestions(" creator posts/v1 ");
    await createAttempt(" question 1/intro ", {
      session_id: " session-1 ",
      selected_option: " B ",
      blanks: [" views ", " likes "],
      prompt_text: " show top posts ",
      code_text: " select(post_id) ",
    });
    await getAttempt(" attempt 1/first ");
    await getDatasetPreview(" tiktok posts/v1 ", 12);
    await getDatasetPreview("tiktok posts/v1", -2);
    await getDatasetPreview("tiktok posts/v1", 101.7);
    await getDatasetPreview("tiktok posts/v1", Number.NaN);
    await listSessionAttempts("session 1/user", "creator posts/v1", 25);
    await listSessionAttempts("session 1/user", undefined, 0);
    await listSessionAttempts("session 1/user", undefined, 501.9);
    await listSessionAttempts("session 1/user", undefined, Number.POSITIVE_INFINITY);
    await listSessionAttempts("session 2/user", undefined, 10);
    await listSessionAttempts("session 3/user", "   ", 10);
    await listSessionAttempts("session 4/user", " creator posts/v1 ", 10);
    await getSessionChallengeSummary("session 1/user", "creator posts/v1");
    await getSessionChallengeSummary(" session 5/user ", " creator posts/v1 ");

    assert.deepEqual(requestedUrls, [
      "http://localhost:8000/challenges/creator%20posts%2Fv1",
      "http://localhost:8000/challenges/creator%20posts%2Fv1/questions",
      "http://localhost:8000/questions/question%201%2Fintro/attempts",
      "http://localhost:8000/attempts/attempt%201%2Ffirst",
      "http://localhost:8000/datasets/tiktok%20posts%2Fv1/preview?limit=12",
      "http://localhost:8000/datasets/tiktok%20posts%2Fv1/preview?limit=1",
      "http://localhost:8000/datasets/tiktok%20posts%2Fv1/preview?limit=100",
      "http://localhost:8000/datasets/tiktok%20posts%2Fv1/preview?limit=20",
      "http://localhost:8000/sessions/session%201%2Fuser/attempts?limit=25&challenge_slug=creator+posts%2Fv1",
      "http://localhost:8000/sessions/session%201%2Fuser/attempts?limit=1",
      "http://localhost:8000/sessions/session%201%2Fuser/attempts?limit=500",
      "http://localhost:8000/sessions/session%201%2Fuser/attempts?limit=100",
      "http://localhost:8000/sessions/session%202%2Fuser/attempts?limit=10",
      "http://localhost:8000/sessions/session%203%2Fuser/attempts?limit=10",
      "http://localhost:8000/sessions/session%204%2Fuser/attempts?limit=10&challenge_slug=creator+posts%2Fv1",
      "http://localhost:8000/sessions/session%201%2Fuser/challenges/creator%20posts%2Fv1/summary",
      "http://localhost:8000/sessions/session%205%2Fuser/challenges/creator%20posts%2Fv1/summary",
    ]);
    assert.deepEqual(attemptBodies, [
      {
        session_id: "session-1",
        selected_option: "B",
        blanks: ["views", "likes"],
        prompt_text: "show top posts",
        code_text: "select(post_id)",
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }

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
