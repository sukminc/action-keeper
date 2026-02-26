# ActionKeeper

Mobile-first **poker staking agreement** app focused on **revenue-first MVP**:
- Generate a staking agreement (structured terms)
- Produce a **tamper-evident** receipt (hash + QR verify)
- Monetize via **paid contract generation** (Stripe) and later add Trip Planner + affiliate

## Product Positioning
ActionKeeper is **DocuSign for poker staking**, built for players and backers who need:
- fast agreement drafting before play starts
- transparent negotiation history
- verifiable receipt after both sides confirm

The app is **free to install/use at entry level**, and monetizes agreement generation and workflow scale.

## MVP Scope (Phase 1: Poker Staking)
**Primary feature:** Paid contract generation + verification  
**Non-custodial:** ActionKeeper never holds funds; it standardizes agreements and provides proof artifacts.

### Negotiation Safeguards (New Requirements)
- Every agreement starts as a **shared draft** that can be viewed via link or QR, but it is *not binding* until both parties acknowledge identical payout terms.
- The database must persist each revision (e.g., “10% of total payout” vs. “10% of net profit”) and clearly mark who proposed it and when they confirmed.
- Counter-offers stay visible side-by-side so user A and user B can converge without confusion; ActionKeeper only generates the final receipt after both select the same option.
- Receipts must embed the canonical promise text, due date/event date, stake percentage, bullet cap, and payout basis so future disputes (like dilution on multi-bullet entries) can be resolved instantly.

Planned features by phase:
- Phase 1 (Revenue MVP): Contract Builder → Pay → PDF + Hash + QR Verify → Vault/List
- Phase 2: Trip Planner (budget + required % sale) + affiliate links
- Phase 3: Verified Resume (optional, later)

## Monetization Strategy (Future-Proof)
Aligned with [VISION.md](VISION.md): revenue first, proof first, non-custodial.

### Packaging
- `Free`: install + limited contract creation + shared negotiation link
- `Pay-per-contract`: one-off fee per finalized agreement/receipt (best for casual users)
- `Pro Unlimited`: monthly/annual unlimited contracts + advanced logs/export
- `Team/Stable`: multi-seat plan for coaches/stables/backing groups with admin analytics

### Unit Economics Direction
- Charge on value moment: **when agreement is finalized and receipt is generated**
- Keep negotiation drafting friction low to maximize completion rate
- Add optional add-ons later: priority support, compliance export, anchored proof tiers

### Anti-Commoditization
- Structured poker-specific terms (stake %, markup, bullet cap, payout basis)
- Revision timeline + dual-confirmation audit trail
- Receipt evidence package designed for poker dispute contexts

## Tech Stack
- Frontend: Next.js (App Router), mobile-first web
- Backend: FastAPI
- DB: Postgres
- Local Dev: Docker Compose monorepo

## Running Locally (Current Testing Flow)
1. Ensure Docker Desktop (or another Docker engine) is running; Compose cannot download Postgres without it.
2. `cp .env.example .env` and set:
   - `NEXT_PUBLIC_API_URL=http://localhost:8000`
   - `VERIFY_BASE_URL=http://localhost:8000`
   - `STRIPE_WEBHOOK_SECRET=<random-test-secret>`
   - `API_TOKEN=dev-token`
   - optional: `ARTIFACTS_DIR=artifacts`, `RATE_LIMIT_PER_MINUTE=200`
3. Apply migrations once before bringing up the stack (this prevents the `agreements.payment_id does not exist` error):
   ```bash
   # If you changed DB credentials and see "password authentication failed",
   # remove the old volume first:
   docker compose down
   docker volume rm action-keeper_postgres_data
   docker compose up -d db
   docker compose run --rm backend alembic upgrade head
   ```
4. Start the full stack and rebuild images when backend code changes:
   ```bash
   docker compose up --build db backend frontend
   ```
   Watch `docker compose logs backend` for a clean "Application startup complete" message; migration failures (missing `script_location`) mean the container was launched before the latest code—rebuild and retry.
5. Frontend dev server tasks (linting, `npm run dev`, etc.) must run from `frontend/`; running them at the repo root triggers `ENOENT` for `package.json`.
6. Manual smoke test loop while Docker is up:
   - `curl http://localhost:8000/api/v1/health`
   - `POST /api/v1/payments/checkout` with `Authorization: Bearer dev-token`
   - `POST /api/v1/payments/webhook` with `X-Webhook-Secret`
   - `POST /api/v1/agreements` supplying the paid `payment_id`
   - `GET /api/v1/agreements` and `/api/v1/agreements/{id}/artifact`
   Keep an eye on backend logs; 404s from the webhook or 402 responses from agreements indicate the payment flow is still being wired up.

### 2026-02-26 Snapshot
- **Negotiation Workflow:** Fully implemented shared contract room supporting turn-based `Accept / Counter / Decline` logic. Supports dual-confirmation, visual diffs of term changes, and a persistent activity feed/audit trail.
- **Infrastructure & Reliability:** 
  - Implemented **Next.js Rewrite Proxy** (`/api/*` -> `backend:8000`) to eliminate CORS issues and simplify frontend-backend connectivity.
  - Upgraded amount columns to `BigInteger` for high-stakes support.
  - Stabilized Alembic migrations up to `v3_negotiation`.
- **Frontend Refinement:** 
  - Polished Seller/Buyer interfaces for poker-specific terminology (stake %, bullet caps, markup).
  - Real-time payout scenario previews in the Contract Room.
- **Artifacts:** Successfully transitioned to `fpdf2` for deterministic PDF generation. 

---

## Current Progress

**Status as of today (2026-02-26):**

| Part | Status | Notes |
| --- | --- | --- |
| 1 — Foundation | ✅ Stable | Monorepo + health check verified locally. |
| 2 — Domain Models | ✅ Stable | Agreements/events repositories pass unit tests. |
| 3 — Service Layer | ✅ Stable | Business rules + event emission implemented. |
| 4 — API Contracts | ✅ Stable | CRUD + Negotiation endpoints (Accept/Counter) live. |
| 5 — Tamper-Evident Receipt | ✅ Stable | SHA-256 hashing + public verification logic implemented. |
| 6 — PDF Artifact Generation | ✅ Stable | Transitioned to `fpdf2`; deterministic PDFs stored in `ARTIFACTS_DIR`. |
| 7 — Payments (Revenue MVP) | ⚠️ Partial | Stripe scaffolding (Checkout/Webhooks) exists but uses simulated session IDs. |
| 8 — Mobile Contract Builder | ✅ Stable | Functional Seller/Buyer mobile UI with negotiation flow. |
| 9 — Audit & Ops | 🚧 Not started | Rate limiting, structured logging, auth hardening queued. |
| 10 — Expansion Hooks | 🚧 In Progress | Trip Planner scaffolding and basic budget logic implemented. |

## Current Blockers & Gaps
- **Authentication:** The system currently relies on a hardcoded `dev-token`. Integration of a real identity provider (e.g., NextAuth, Firebase, or Clerk) is required for production.
- **Production Payments:** Stripe integration requires real API keys and a production-grade checkout flow to move beyond simulation.
- **QR Code Rendering:** While hashing and verification URLs are functional, QR image embedding in the `fpdf2` layout is temporarily disabled for testing focus and needs to be re-enabled.
- **Ops Hardening:** Part 9 tasks (Rate limiting, structured logging) are necessary before any public-facing beta deployment.

---

**What is already working today:**
- FastAPI boots locally and exposes `/api/v1/health` and agreement CRUD when the DB schema matches the ORM.
- Alembic assets (`backend/alembic`) exist; running `alembic upgrade head` inside the backend container unblocks payment/receipt experiments.
- Deterministic PDFs and verification URLs are generated on the backend; embedding an actual QR image plus negotiation metadata is a known follow-up.
- Docker Compose remains the canonical way to stand up Postgres + API + Next.js for manual testing.

---

## Roadmap: Parts 1–10 (TDD-Gated)

Each part must pass **unit tests → quick QA → integration tests** before moving forward.

### Part 1 — Project Foundation (Baseline) ✅
- Repository structure (monorepo)
- Docker Compose (frontend, backend, DB)
- Health check endpoint (`/api/v1/health`)
- CI-ready test setup (pytest, basic fixtures)

**Outcome:** System boots locally and is observable.

---

### Part 2 — Core Domain Models & Repositories ✅
- Agreement domain model
- Event (audit log) domain model
- Repository layer (CRUD, append-only events)
- SQLite-safe types for testing, Postgres-ready for prod

**Outcome:** Domain persistence works and is fully unit-tested.

---

### Part 3 — Service Layer (Business Rules) ✅
- Agreement creation service
- Default rules (status, versions, timestamps)
- Event emission on state changes
- Validation beyond schemas (domain-level)

**Outcome:** Business logic isolated and testable.

---

### Part 4 — API Contracts (Agreements) ✅
- Create agreement endpoint
- List / retrieve agreement endpoints
- Request/response schemas stabilized
- Error handling + HTTP semantics

**Outcome:** Frontend can create and read agreements via API.

---

### Part 5 — Tamper-Evident Receipt ✅
- Deterministic agreement hashing
- Hash persistence + verification logic
- Public verify endpoint (read-only)
- QR payload structure defined

**Outcome:** Agreements are cryptographically verifiable.

---

### Part 6 — PDF Artifact Generation ✅
- Agreement → PDF rendering
- Embed hash + verification URL
- Deterministic layout for consistency
- Store artifact metadata + download endpoint

**Outcome:** Shareable, receipt-like contract artifact exists.

---

### Part 7 — Payments (Revenue MVP) ✅
- Stripe-style Checkout session scaffolding
- Paid contract generation gate enforced by `payment_id`
- Webhook handling (idempotent secret validation)
- Payment → agreement linkage surfaced via APIs

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
