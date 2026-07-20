# Datagolf Product Roadmap

This roadmap is scoped to the current repo state: a polished Next.js UI, a
FastAPI backend, one versioned TikTok challenge, local CSV assets, and SQLite
attempt persistence. The highest-value next step is turning the existing UI
into a real challenge runner before expanding the product surface.

## Next Feature: Challenge Runner

Build `/challenges/tiktok-creator-posts` as the first fully usable product
flow. It should load challenge metadata and questions from the API, maintain an
anonymous browser session, let the user answer all question types, submit
attempts, and show actionable feedback.

### First Implementation Slice

1. Add a typed web API client for challenge, question, and attempt endpoints.
2. Add anonymous `session_id` creation and persistence in `localStorage`.
3. Add a challenge runner route for the TikTok creator posts challenge.
4. Render the active question from API data instead of hardcoded page content.
5. Submit attempts to `POST /questions/{id}/attempts`.
6. Show correctness, generated code, and evaluator feedback after submission.
7. Track local progress across the 15-question challenge.
8. Add a completion summary with correct, incorrect, skipped, and retry counts.

## Feature Backlog

1. Challenge catalog loaded from the backend.
2. Challenge detail page generated from runtime specs.
3. Dataset preview endpoint.
4. Dataset schema panel.
5. Dataset row sample controls.
6. Question navigator.
7. Per-question progress state.
8. Guided prompt answer form.
9. Multiple-choice answer form.
10. Fill-blank answer form.
11. Micro-code answer form.
12. Attempt feedback panel.
13. Generated R code viewer.
14. Authoritative result table viewer.
15. Required-code-check feedback.
16. Retry flow for incorrect attempts.
17. Attempt history per question.
18. Browser session resume.
19. Challenge completion summary.
20. Anonymous score calculation.
21. Anonymous leaderboard.
22. Shareable result URL.
23. Copy prompt and code buttons.
24. Export generated code.
25. Backend `GET /challenges` endpoint.
26. Backend `GET /datasets/{slug}/preview` endpoint.
27. Backend `GET /sessions/{id}/attempts` endpoint.
28. Backend challenge summary endpoint for a session.
29. Friendlier evaluator messages.
30. Challenge spec validation command.
31. Dev/admin spec inspection page.
32. Second challenge pack.
33. Supabase attempt persistence.
34. Supabase dataset storage.
35. Deployment-ready environment configuration.

## Test Strategy

The test suite should prove that product behavior works end to end, not only
that static assets exist.

### Backend

1. Evaluator unit tests for guided prompts, multiple choice, fill blanks, and
   micro-code.
2. API tests for health, challenge detail, question listing, attempt creation,
   and attempt retrieval.
3. Repository tests using temporary SQLite databases.
4. Challenge spec validation tests for required display and evaluation fields.
5. Regression tests for the TikTok challenge expected answers.

### Web

1. Component tests for rendering each question type.
2. API client tests for request and response handling.
3. Session utility tests for anonymous ID persistence.
4. Progress reducer/state tests.
5. Playwright happy path from challenge open to completed attempt.
6. Playwright coverage for API error and retry states.

### Project Gates

Add root scripts for:

1. `test:api`
2. `test:web`
3. `test:e2e`
4. `lint`
5. `build`

Every shipped feature should add or update the smallest test that proves the
new behavior is useful.
