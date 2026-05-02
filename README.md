<img width="1785" height="899" alt="image" src="https://github.com/user-attachments/assets/a1bbc4c4-32ac-4a9f-b4de-17c93f388634" />


# Proof of Life

**Your idea was dead this morning. Prove it’s alive now.**

Proof of Life turns a 24-hour buildathon sprint into a judge-ready public proof page. Builders can document what they started with, what they built, the blockers they survived, the breakthroughs that mattered, and the evidence that proves the project came alive.

Built for the Replit 10-Year Buildathon.

## Live Demo

- App: https://proof-of-life.replit.app
- Example dossier: https://proof-of-life.replit.app/p/proof-of-life-builds-itself

## What it does

- Create a public proof page for a 24-hour buildathon project.
- Track milestones, blockers, breakthroughs, and screenshots.
- Show the project’s before/after progress as a judge-ready case file.
- Generate a factual judge briefing and 60-second demo script.
- Copy a submission-ready summary.

## Why it exists

Buildathon judging often depends on whether progress is visible.

A builder may accomplish a lot in 24 hours, but by the end of the sprint the story is usually scattered across screenshots, half-remembered bugs, and exhausted explanations. Proof of Life packages that chaos into a clear public dossier:

- what existed before
- what exists now
- what changed in between
- where the evidence is
- why the progress matters

The app’s seeded example documents the creation of Proof of Life itself.

## Core flow

1. Create a case file.
2. Add milestones as evidence.
3. Mark blockers and breakthroughs.
4. Attach screenshots.
5. Publish a public proof page.
6. Copy a judge-ready summary or demo script.

## Main routes

- `/` — landing page
- `/new` — create a new proof page
- `/edit/:id?token=...` — edit a project using a private edit token
- `/p/:slug` — public proof page
- `/card/:slug` — condensed share card

## Tech stack

- React
- Vite
- TypeScript
- Tailwind CSS
- Express
- PostgreSQL
- Drizzle ORM
- TanStack React Query
- Zod
- Anthropic via Replit AI Integrations, with graceful fallback when AI is unavailable

## Architecture

This is a pnpm monorepo:

```txt
artifacts/proof-of-life    React + Vite frontend
artifacts/api-server       Express backend mounted at /api
lib/db                     Shared Drizzle database schema
