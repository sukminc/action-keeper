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

## Repo Structure
```text
action-keeper/
├── docker-compose.yml
├── backend/         # FastAPI
└── frontend/        # Next.js (mobile web)

Local Setup

1) Environment

Copy env file:

cp .env.example .env

Set NEXT_PUBLIC_API_URL in .env:
	•	Desktop: http://localhost:8000
	•	Phone testing: http://<YOUR_LAN_IP>:8000

2) Run the stack

From repo root:

docker compose up --build

3) Quick QA

API health:

curl http://localhost:8000/api/v1/health
# {"status":"ok"}

Frontend:
	•	http://localhost:3000
	•	From phone (same Wi-Fi): http://<YOUR_LAN_IP>:3000

TDD Workflow (10 Parts)

We build in 10 parts with a strict gate:
	1.	Write unit tests
	2.	Implement until green
	3.	Quick QA (manual)
	4.	Integration test gate
	5.	Move to next part

Current Part:
	•	Part 1: Repo + Compose + Health endpoints (baseline)

Development Notes
	•	This project is intended to be scalable:
	•	stateless API
	•	durable storage for artifacts (later S3)
	•	event/audit logging (append-only)
	•	idempotent payment webhooks (Stripe)
