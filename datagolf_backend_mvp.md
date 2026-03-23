# Datagolf.dev Backend Implementation (MVP)

## Overview

The goal of this MVP is to build a simple, fast, and scalable backend
that supports:

-   Interactive data challenges
-   Prompt → generated R code → evaluated results
-   Lightweight scoring and validation
-   No authentication (anonymous sessions only)

### Core Philosophy

-   Bias toward simplicity
-   Avoid premature complexity
-   Fake hard parts (R execution) when possible
-   Optimize for iteration speed

------------------------------------------------------------------------

## Architecture

Next.js (apps/web) ↓ FastAPI (apps/api) ↓
---------------------------------------- \| Supabase Postgres
(metadata/attempts) \| \| Supabase Storage (CSV datasets) \| \| Python
(pandas) evaluation engine \| ----------------------------------------

------------------------------------------------------------------------

## ⚙️ Tech Stack

### Backend

-   FastAPI (apps/api)
-   Python (pandas for data processing)

### Database & Storage

-   Supabase Postgres → structured data (questions, attempts)
-   Supabase Storage → CSV datasets

### Deployment

-   Google Cloud Run (containerized FastAPI)

------------------------------------------------------------------------

## Monorepo Structure

apps/ web/ \# Next.js frontend api/ \# FastAPI backend

packages/ db/ \# DB models, migrations, repositories core/ \# shared
schemas, validation, helpers challenges/ \# challenge definitions
(hardcoded)

infra/ docker/ \# Docker configs

data/ \# local CSVs (dev only, gitignored)

------------------------------------------------------------------------

## Core Design Decisions

### 1. Hardcode Challenges (for MVP)

-   Define in code (packages/challenges)
-   Persist only attempts

### 2. Do NOT Execute R (MVP Shortcut)

-   Generate R code
-   Validate with Python (pandas)

### 3. Anonymous Sessions Only

-   localStorage anonymous_id

------------------------------------------------------------------------

## Database Schema

### datasets

id, slug, name, storage_path, row_count, column_count, created_at

### challenges

id, slug, title, dataset_id, description, is_active, created_at

### questions

id, challenge_id, order_index, type, title, context, task, hint_words,
answer_spec, difficulty, created_at

### attempts

id, challenge_id, question_id, session_id, prompt_text, generated_code,
result_payload, is_correct, token_count, created_at

------------------------------------------------------------------------

## API Endpoints

GET /health\
GET /datasets/{slug}\
GET /challenges/{slug}\
GET /challenges/{slug}/questions

POST /questions/{id}/generate\
POST /questions/{id}/run\
POST /questions/{id}/submit

------------------------------------------------------------------------

## Evaluation Strategy

-   Guided Prompt → validate structure + output
-   Multiple Choice → direct match
-   Fill Blank → accepted answers
-   Micro-code → exact/variant match

------------------------------------------------------------------------

## Dataset Handling

Supabase Storage:

challenge-datasets/ tiktok-posts/v1/posts.csv

Load into pandas, cache in memory.

------------------------------------------------------------------------

## Deployment

-   FastAPI → Docker → Cloud Run
-   Next.js → Vercel

------------------------------------------------------------------------

## Auth

MVP: anonymous sessions\
Later: Supabase Auth + RLS

------------------------------------------------------------------------

## Build Order

1.  Hardcode challenge + CSV
2.  Add prompt → code generation
3.  Add pandas evaluation
4.  Add Supabase persistence

------------------------------------------------------------------------

## Final Summary

FastAPI + Cloud Run + Supabase (Postgres + Storage)

Hardcode challenges.\
Validate with Python.\
Ship fast.
