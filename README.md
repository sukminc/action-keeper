# ActionKeeper

Mobile-first **poker staking agreement** app focused on **revenue-first MVP**:
- Generate a staking agreement (structured terms)
- Produce a **tamper-evident** receipt (hash + QR verify)
- Monetize via **paid contract generation** (Stripe) and later add Trip Planner + affiliate

## MVP Scope (Phase 1: Poker Staking)
**Primary feature:** Paid contract generation + verification  
**Non-custodial:** ActionKeeper never holds funds; it standardizes agreements and provides proof artifacts.

Planned features by phase:
- Phase 1 (Revenue MVP): Contract Builder → Pay → PDF + Hash + QR Verify → Vault/List
- Phase 2: Trip Planner (budget + required % sale) + affiliate links
- Phase 3: Verified Resume (optional, later)

## Tech Stack
- Frontend: Next.js (App Router), mobile-first web
- Backend: FastAPI
- DB: Postgres
- Local Dev: Docker Compose monorepo

---
## Repository Structure

This repository is a lightweight monorepo with a clear separation between **backend domain logic** and **frontend mobile-first UI**.  
It is designed for **TDD-first development**, SQLite-safe testing, and future PostgreSQL production deployment.

### Full tree

```bash
tree -a -I 'node_modules|.next|__pycache__|.pytest_cache|.venv|.git'
.
├── .env.example
├── .gitignore
├── .vscode
│   └── settings.json
├── README.md
├── backend
│   ├── Dockerfile
│   ├── app
│   │   ├── __init__.py
│   │   ├── api
│   │   │   └── v1
│   │   │       ├── __init__.py
│   │   │       └── health.py
│   │   ├── db
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── models
│   │   │   │   ├── __init__.py
│   │   │   │   ├── agreement.py
│   │   │   │   └── event.py
│   │   │   ├── session.py
│   │   │   └── types.py
│   │   ├── main.py
│   │   ├── repositories
│   │   │   ├── __init__.py
│   │   │   ├── agreements_repo.py
│   │   │   └── events_repo.py
│   │   └── schemas
│   │       ├── __init__.py
│   │       └── agreement.py
│   ├── pytest.ini
│   ├── requirements.txt
│   └── tests
│       ├── __init__.py
│       ├── conftest.py
│       ├── test_agreements_repo.py
│       ├── test_events_repo.py
│       └── test_health.py
├── docker-compose.yml
└── frontend
    ├── Dockerfile
    ├── next-env.d.ts
    ├── next.config.js
    ├── package-lock.json
    ├── package.json
    ├── src
    │   └── app
    │       ├── layout.tsx
    │       └── page.tsx
    └── tsconfig.json
```

### Directory responsibilities

**Repo root**
- `.env.example`: environment variable template
- `docker-compose.yml`: local orchestration for backend + frontend
- `.vscode/`: editor configuration for consistent linting and testing

**Backend (`backend/`)**
- `app/main.py`: FastAPI application entrypoint
- `app/api/v1/`: versioned HTTP endpoints
- `app/schemas/`: Pydantic request/response contracts
- `app/repositories/`: persistence layer (DB access only, no business rules)
- `app/db/`: database configuration and SQLAlchemy setup
  - `base.py`: Declarative Base
  - `types.py`: dialect-safe types (SQLite tests / Postgres prod)
  - `models/`: ORM table definitions (single source of truth)
- `tests/`: pytest suite (SQLite in-memory)
- `requirements.txt`: backend dependencies

**Frontend (`frontend/`)**
- `src/app/`: Next.js App Router
- `layout.tsx`: root layout
- `page.tsx`: landing page
- `Dockerfile`: frontend container build

This structure enforces strict separation between API, persistence, and UI, and supports incremental TDD-driven expansion (payments, trip planner, generic P2P agreements).

---

## Roadmap: Parts 1–10 (TDD-Gated)

Each part must pass **unit tests → quick QA → integration tests** before moving forward.

### Part 1 — Project Foundation (Baseline)
- Repository structure (monorepo)
- Docker Compose (frontend, backend, DB)
- Health check endpoint (`/api/v1/health`)
- CI-ready test setup (pytest, basic fixtures)

**Outcome:** System boots locally and is observable.

---

### Part 2 — Core Domain Models & Repositories
- Agreement domain model
- Event (audit log) domain model
- Repository layer (CRUD, append-only events)
- SQLite-safe types for testing, Postgres-ready for prod

**Outcome:** Domain persistence works and is fully unit-tested.

---

### Part 3 — Service Layer (Business Rules)
- Agreement creation service
- Default rules (status, versions, timestamps)
- Event emission on state changes
- Validation beyond schemas (domain-level)

**Outcome:** Business logic isolated and testable.

---

### Part 4 — API Contracts (Agreements)
- Create agreement endpoint
- List / retrieve agreement endpoints
- Request/response schemas stabilized
- Error handling + HTTP semantics

**Outcome:** Frontend can create and read agreements via API.

---

### Part 5 — Tamper-Evident Receipt
- Deterministic agreement hashing
- Hash persistence + verification logic
- Public verify endpoint (read-only)
- QR payload structure defined

**Outcome:** Agreements are cryptographically verifiable.

---

### Part 6 — PDF Artifact Generation
- Agreement → PDF rendering
- Embed hash + verification URL
- Deterministic layout for consistency
- Store artifact metadata

**Outcome:** Shareable, receipt-like contract artifact exists.

---

### Part 7 — Payments (Revenue MVP)
- Stripe Checkout integration
- Paid contract generation gate
- Webhook handling (idempotent)
- Payment → agreement linkage

**Outcome:** App generates real revenue.

---

### Part 8 — Frontend Contract Builder (Mobile-First)
- Agreement input flow (mobile UX)
- Payment flow integration
- Contract list / vault view
- QR scan / verify entry points

**Outcome:** End-to-end user flow is usable on phone.

---

### Part 9 — Audit, Hardening, and Ops
- Event timeline view (per agreement)
- Rate limiting & basic auth hardening
- Structured logging
- Config separation (dev / prod)

**Outcome:** Production-readiness baseline.

---

### Part 10 — Expansion Hooks
- Trip Planner domain scaffolding
- Affiliate link placeholders
- Generic “agreement” abstraction (non-poker reuse)
- Migration readiness (Alembic)

**Outcome:** Platform is extensible beyond poker staking.

---

**Monetization Checkpoint:**  
Revenue must be observable by **Part 7**.  
All later parts must not break paid contract generation.
---
