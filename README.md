# ActionKeeper

Structured agreement workflow for trust-heavy decisions.

ActionKeeper began as a poker staking product, but the engineering value of the repo is broader: it shows how I model offers, counters, confirmations, artifacts, and audit trails in a workflow where trust matters and the final state must be explicit.

## Product Idea

The core flow is:

1. One side creates an offer
2. The other side reviews it
3. Both sides can counter, accept, or decline
4. Once both agree on the same terms, the system generates a tamper-evident artifact

The current implementation is still domain-specific, but the technical pattern is useful well beyond poker:

- negotiation state
- versioned terms
- append-only event history
- artifact generation
- verification flow

## What Is Implemented

- FastAPI backend with agreement, revision, payment, event, and artifact models
- Next.js frontend with seller, buyer, and shared contract-room flows
- append-only revision history for negotiations
- agreement hashing and verification URLs
- PDF artifact generation
- simulated payment scaffolding
- mobile-first UI for creating and reviewing offers

## Why This Repo Matters

This is one of the better examples in my portfolio of product engineering with real workflow complexity:

- business rules live in a service layer
- state transitions are explicit
- the user flow is more than CRUD
- the system preserves auditability as terms change

## Architecture

### Frontend

The Next.js app provides:

- landing page
- seller flow
- buyer flow
- shared contract room
- agreement vault

Important files:

- [frontend/src/app/page.tsx](/Users/chrisyoon/GitHub/one-percent-better-poker-staking/frontend/src/app/page.tsx)
- [frontend/src/app/sections/ContractBuilder.tsx](/Users/chrisyoon/GitHub/one-percent-better-poker-staking/frontend/src/app/sections/ContractBuilder.tsx)
- [frontend/src/app/sections/ContractRoom.tsx](/Users/chrisyoon/GitHub/one-percent-better-poker-staking/frontend/src/app/sections/ContractRoom.tsx)

### Backend

The FastAPI backend handles:

- agreement creation
- counter-offers
- confirmation flow
- event logging
- payment gating
- artifact generation
- verification

Important files:

- [backend/app/main.py](/Users/chrisyoon/GitHub/one-percent-better-poker-staking/backend/app/main.py)
- [backend/app/services/agreements_service.py](/Users/chrisyoon/GitHub/one-percent-better-poker-staking/backend/app/services/agreements_service.py)
- [backend/app/services/payments_service.py](/Users/chrisyoon/GitHub/one-percent-better-poker-staking/backend/app/services/payments_service.py)
- [backend/app/artifacts/pdf_renderer.py](/Users/chrisyoon/GitHub/one-percent-better-poker-staking/backend/app/artifacts/pdf_renderer.py)

## Repo Structure

```text
one-percent-better-poker-staking/
├── backend/
│   ├── app/
│   ├── alembic/
│   └── tests/
├── frontend/
│   └── src/app/
├── docker-compose.yml
├── VISION.md
└── README.md
```

## Running Locally

### Backend and database

```bash
docker compose up --build db backend
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Health check

```bash
curl http://localhost:8000/api/v1/health
```

## Current Status

This is an active product build, not a finished commercial release.

What is strong today:

- domain model
- negotiation flow
- event and revision tracking
- artifact generation
- service-layer organization

What is still incomplete:

- production-grade auth
- real payment integration
- operational hardening
- broader non-poker abstraction

## Hiring Signal

I would not point to this repo as a generic SaaS clone. I would point to it as evidence that I can handle:

- messy product state
- workflow-heavy backend logic
- user trust problems
- full-stack iteration across API, persistence, and UI
