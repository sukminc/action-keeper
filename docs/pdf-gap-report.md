# ActionKeeper PDF vs Repo Gap Report

## Overview
- **Date:** February 25, 2026
- **Inputs:** `/Users/chrisyoon/GitHub/action-keeper/output/pdf/actionkeeper-app-summary.pdf` vs repo `f9560815634d5a56b3a39498cb24b6ec71a75760`
- **Method:** The environment cannot reach PyPI (pip install of `pdfplumber`/`pypdf` failed), so a custom parser extracted every text operator from the PDF content stream to keep the comparison machine-verifiable.

## Legend
| Status | Meaning |
| --- | --- |
| Accurate | Statement matches current repo evidence. |
| Partially accurate | Statement mixes implemented facts with roadmap/future work or omits caveats. |
| Not implemented | Feature is explicitly future work per roadmap/status. |
| Not found | Repo docs/code contain no supporting evidence for the statement. |

## Section Findings

### What It Is
| PDF Statement | Repo Evidence | Status | Recommended Action |
| --- | --- | --- | --- |
| ActionKeeper is a mobile-first poker staking contract builder focused on a revenue-first MVP. | `README.md:3` | Accurate | None. |
| It standardizes deal terms and issues tamper-evident proof artifacts without holding funds. | `README.md:5`<br>`README.md:10` | Accurate | None. |

### Who It’s For
| PDF Statement | Repo Evidence | Status | Recommended Action |
| --- | --- | --- | --- |
| Poker backers, stakers, and players who need trustworthy staking agreements on their phones. | `README.md:3` states the product is for poker staking, but no persona wording exists elsewhere. | Partially accurate | Add an explicit persona section to `README.md`/`VISION.md` or soften the PDF copy to “poker staking partners” until personas are documented. |

### What It Does
| PDF Statement | Repo Evidence | Status | Recommended Action |
| --- | --- | --- | --- |
| FastAPI agreement API (create, list, retrieve) with service and repository layers plus tests. | `README.md:130`<br>`backend/app/api/v1/agreements.py:15` | Accurate | None. |
| Paid contract generation monetized through Stripe Checkout as the Phase 1 revenue gate. | `README.md:207` (Stripe work scheduled for Part 7, not built). | Not implemented | Update the PDF to mark Stripe monetization as future work or implement and document the feature. |
| Tamper-evident receipts that hash agreements and power QR verification (Part 5 next). | `README.md:125`<br>`README.md:187` | Partially accurate | Either finish Part 5 (hash persistence, verification endpoint, QR payload) or reword the PDF to “planned next.” |
| Agreement vault/list views and stored artifacts for every staking contract. | `README.md:217` | Not implemented | Remove or label as roadmap until the vault/list UI exists. |
| Trip Planner budgeting plus affiliate hooks extend the experience into travel logistics. | `README.md:12`<br>`README.md:14` | Not implemented | Flag as roadmap only. |
| Verified resume expansion reuses agreement history beyond poker staking. | `README.md:15` | Not implemented | Mark as future expansion; not part of today’s feature list. |

### How It Works
| PDF Statement | Repo Evidence | Status | Recommended Action |
| --- | --- | --- | --- |
| Frontend: Next.js App Router in `frontend/src/app`. | `README.md:17`<br>`frontend/src/app/page.tsx:1` | Accurate | None. |
| Dockerized via `frontend/Dockerfile`, it calls the API through `NEXT_PUBLIC_API_URL`. | `frontend/Dockerfile:1`<br>`docker-compose.yml:35`<br>`frontend/src/app/page.tsx:6` | Accurate | None. |
| Backend: FastAPI entrypoint `backend/app/main.py` wires API, schemas, services, and repositories. | `README.md:99`<br>`backend/app/main.py:5` | Accurate | None. |
| Routes `/api/v1/agreements` and `/api/v1/health` persist via SQLAlchemy models and emit events. | `README.md:130`<br>`backend/app/api/v1/agreements.py:15`<br>`backend/app/api/v1/agreements.py:28`<br>`backend/app/services/agreements_service.py:37` | Accurate | None. |
| Persistence: Dockerized Postgres 15 (`db`) stores agreements + events; tests run on SQLite. | `docker-compose.yml:4`<br>`README.md:26` | Accurate | None. |
| Flow: User builds a contract in Next.js; backend validates through services. | `README.md:217` | Partially accurate | Clarify that the Contract Builder UI is still on the roadmap. |
| Repositories commit to Postgres events, and Part 5 will add hashing + QR receipts. | `backend/app/repositories/events_repo.py:13`<br>`README.md:187` | Partially accurate | Keep the event logging portion, but move the hashing/QR mention to the roadmap status until Part 5 ships. |

### How To Run
| PDF Statement | Repo Evidence | Status | Recommended Action |
| --- | --- | --- | --- |
| Copy `.env.example` to `.env` and set `NEXT_PUBLIC_API_URL=http://localhost:8000`. | `README.md:96` only lists `.env.example` as a file; no setup instructions exist. | Not found | Add explicit env-setup steps to `README.md` or remove from PDF. |
| Run `docker compose up --build db backend frontend` to launch Postgres, FastAPI, and Next.js. | `docker-compose.yml` defines services but `README.md` lacks a runbook. | Not found | Document local dev steps (docker compose command, service ports). |
| Open http://localhost:3000 (UI) and http://localhost:8000/api/v1/health (API) to verify. | No verification instructions documented. | Not found | Add a “Getting Started” or “Verification” section in `README.md`. |

## Summary of Required Follow-ups
1. **Revise the PDF feature list** to segregate current capabilities vs Phases 2–3 items (Stripe payments, Trip Planner, Verified Resume, vault UI).
2. **Finish or downscope Part 5 messaging**—the PDF currently implies tamper-evident receipts + QR verification already exist.
3. **Document personas and run steps** in repo docs so the PDF is reference-backed.
4. **Clarify Contract Builder status** (still Part 8) to avoid overselling current UX.

## Next Steps
1. Update `README.md` (or add `docs/getting-started.md`) with env setup, docker compose command, and verification URLs referenced in the PDF.
2. Decide whether to refresh the PDF now (recommended) or after the missing features land; align statements accordingly.
3. Track roadmap-aligned features (Stripe monetization, vault UI, Trip Planner, resume) in issues so future PDF revisions can cite actual commits.

## Appendix: Extracted PDF Statements
```json
{
  "What It Is": [
    "ActionKeeper is a mobile-first poker staking contract builder focused on a revenue-first MVP.",
    "It standardizes deal terms and issues tamper-evident proof artifacts without holding funds."
  ],
  "Who It'S For": [
    "Poker backers, stakers, and players who need trustworthy staking agreements on their phones."
  ],
  "What It Does": [
    "- FastAPI agreement API (create, list, retrieve) with service and repository layers plus tests.",
    "- Paid contract generation monetized through Stripe Checkout as the Phase 1 revenue gate.",
    "- Tamper-evident receipts that hash agreements and power QR verification (Part 5 next).",
    "- Agreement vault/list views and stored artifacts for every staking contract.",
    "- Trip Planner budgeting plus affiliate hooks extend the experience into travel logistics.",
    "- Verified resume expansion reuses agreement history beyond poker staking."
  ],
  "How It Works": [
    "- Frontend: Next.js App Router in `frontend/src/app`.",
    "  Dockerized via `frontend/Dockerfile`, it calls the API through `NEXT_PUBLIC_API_URL`.",
    "- Backend: FastAPI entrypoint `backend/app/main.py` wires API, schemas, services, and repositories.",
    "  Routes `/api/v1/agreements` and `/api/v1/health` persist via SQLAlchemy models and emit events.",
    "- Persistence: Dockerized Postgres 15 (`db`) stores agreements + events; tests run on SQLite.",
    "- Flow: User builds a contract in Next.js; backend validates through services.",
    "  Repositories commit to Postgres events, and Part 5 will add hashing + QR receipts."
  ],
  "How To Run": [
    "1. Copy `.env.example` to `.env` and set `NEXT_PUBLIC_API_URL=http://localhost:8000`.",
    "2. Run `docker compose up --build db backend frontend` to launch Postgres, FastAPI, and Next.js.",
    "3. Open http://localhost:3000 for the UI and http://localhost:8000/api/v1/health to verify the API."
  ]
}
```
