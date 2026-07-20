# Datagolf

Datagolf is now structured as a small monorepo for the MVP:

- `apps/web`: Next.js frontend
- `apps/api`: FastAPI backend
- `packages/challenges/tiktok/v1`: versioned TikTok challenge source and runtime spec
- `data/challenge-datasets/tiktok-posts/v1`: versioned CSV dataset for local development

## Challenge Assets

The existing TikTok source files are preserved and mirrored into the versioned runtime layout:

- Editorial source: [packages/challenges/tiktok/v1/source.md](/Users/imanmokua/Desktop/workspace/github.com/manue7mokua/datagolf/packages/challenges/tiktok/v1/source.md)
- Runtime spec: [packages/challenges/tiktok/v1/spec.json](/Users/imanmokua/Desktop/workspace/github.com/manue7mokua/datagolf/packages/challenges/tiktok/v1/spec.json)
- Dataset CSV: [data/challenge-datasets/tiktok-posts/v1/datagolf_tiktok_posts_500.csv](/Users/imanmokua/Desktop/workspace/github.com/manue7mokua/datagolf/data/challenge-datasets/tiktok-posts/v1/datagolf_tiktok_posts_500.csv)

The backend reads the structured `spec.json` at runtime. The markdown file remains the human-authored source document.

## Roadmap

The next product milestone is a real challenge runner that connects the
finished UI to the FastAPI attempt flow. See [docs/roadmap.md](/Users/imanmokua/Desktop/workspace/github.com/manue7mokua/datagolf/docs/roadmap.md)
for the feature backlog and test strategy.

## Web App

Install frontend dependencies from the repo root and run the existing Next.js app:

```bash
pnpm install
pnpm dev
```

The web workspace lives in `apps/web`.

## API

Create a Python environment, install the API requirements, and run FastAPI from the repo root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r apps/api/requirements.txt
pnpm dev:api
```

The API exposes:

- `GET /health`
- `GET /challenges/{slug}`
- `GET /challenges/{slug}/questions`
- `POST /questions/{id}/attempts`
- `GET /attempts/{id}`

## Guided Prompt Evaluation

Guided prompt questions generate R-style code but do not execute it. The backend:

1. Creates or requests generated code.
2. Computes the authoritative answer from the CSV with pandas.
3. Compares that authoritative result to the encoded reference preview from the spec.
4. Runs heuristic code checks against the generated code.

This means MVP correctness for guided prompts is result-based and intent-checked, not true R execution.

## LLM Configuration

If `OPENAI_API_KEY` is set, the API will try to generate code through the OpenAI Responses API. If the key is missing, or if the request fails and fallback is allowed, the API uses a local template generator so guided prompts still work in local development.
