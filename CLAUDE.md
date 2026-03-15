# CLAUDE.md — ActionKeeper

## Repo Role

Poker workflow product for staking and agreement management.

Current weekly posture: `hold`.

This repo is part of the poker vertical, but it should stay grounded in what the repo actually demonstrates today:

- structured offers and counters
- explicit agreement state transitions
- event history
- artifact generation
- trust-heavy workflow design

## Repo Identity

- Repo: `sukminc/one-percent-better-poker-staking`
- Landing slug: `actionkeeper`
- Vertical: poker

## Guardrails

- Keep the repo framed as a workflow product with a real poker use case.
- Do not oversell it as a generic platform before the current flow is tighter.
- Do not let the marketing story outrun the implementation.
- Do not let this repo compete with `Exploit Better` for the main poker story this week.
- Preserve auditability and explicit state changes as the main engineering signal.

## Current Truth

Trust `README.md` for implemented scope.

What matters most:

- FastAPI backend
- Next.js frontend
- revision history
- PDF artifacts
- negotiation engine

## Commands

```bash
cd backend && uvicorn app.main:app --reload
cd frontend && npm run dev
```
