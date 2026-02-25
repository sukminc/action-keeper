# ActionKeeper — Product Vision & Direction

## Purpose

ActionKeeper exists to **generate revenue-first, verifiable agreements** for poker staking.

The long-term vision is to become a **trust and proof layer for peer-to-peer agreements**,  
but the product must earn revenue early and remain legally lightweight.

This document defines the **directional guardrails** for development.
When implementation choices feel unclear, this file is the reference point.

---

## Core Philosophy

1. **Proof over enforcement**
   - ActionKeeper never holds funds.
   - We do not force outcomes.
   - We provide immutable, verifiable records of intent and agreement.

2. **Events are subjective, status is objective**
   - Users can submit claims (events).
   - Agreement status only changes when rules are satisfied (e.g. dual confirmation).

3. **Revenue before reputation**
   - Monetization (paid contract generation) comes before social features.
   - Trust and reputation emerge later from recorded history.

4. **No premature identity burden**
   - Identity verification is expensive (UX, legal, ops).
   - It must be optional and staged, never blocking MVP revenue.

---

## Current Focus (MVP Scope)

### What ActionKeeper IS (for now)
- A **paid poker staking agreement generator**
- A **tamper-evident receipt system** (hash-based verification)
- A **neutral record keeper**
- A **negotiation log** that captures every revision until both humans agree on the same promise

### What ActionKeeper IS NOT (for now)
- A wallet
- A payment processor
- A dispute resolver
- A social network
- A credit / lending platform

---

## Agreement Model — Directional Rules

### Agreements
- Represent *shared intent*, not guaranteed outcomes
- Are immutable once finalized (content-wise)
- Can evolve in **status**, not in original terms
- Must capture **payout basis** explicitly (gross payout, net profit, or dilution-adjusted) along with stake %, buy-in limit, bullets, and due date so “10% of total vs. 10% net” conflicts never reappear.

### Status (conceptual, future-ready)
- draft
- proposed
- countered
- awaiting_confirmation
- accepted
- active
- reported_profit
- reported_loss
- settled
- disputed
- cancelled

> Status transitions must be rule-driven, not user-forced.

---

## Event Model — Directional Rules

- Events are **append-only**
- Events represent *claims or actions by a single actor*
- Events alone do NOT change agreement status
- Negotiation events (draft → counter → confirmation) must reference both actors and the exact terms being accepted; ActionKeeper should store every revision so either party can audit why the final contract says what it says.

### Dual-Confirmation Principle
Certain status changes require:
- Same agreement
- Same event type
- Identical payload (hash match)
- Different actors

Only then can the agreement be considered objectively updated.

---

## Handling Loss / Non-Payment Scenarios

- Loss is a valid outcome, not a failure
- “Unable to repay” is recorded, not punished
- ActionKeeper does not judge morality or intent
- The system’s role extends to **pre-loss clarity**: enforce that stake percentages, payout basis, and bullet caps are written and signed before the event date.

The system’s role is **historical accuracy**, not enforcement.

---

## Identity & Fraud — Future Direction (Not MVP)

Identity is layered intentionally:

### Phase 0 — MVP
- No user accounts required
- Agreements can be created without identity

### Phase 1 — Revenue Stability
- Email verification
- Phone verification
- Basic anti-abuse checks

### Phase 2 — Trust Signals
- Legal name verification
- Government ID via third-party KYC
- Selfie + ID match
- Verified badge (optional)

> Identity increases trust, but must never break the core product.

---

## Blockchain Positioning (Non-Dogmatic)

Blockchain may be used as:
- An **anchoring layer** (hash notarization)
- A **public proof reference**

Blockchain is NOT required for:
- Core agreement logic
- MVP revenue
- Trust inside small communities

Off-chain first. Anchor later if it strengthens proof, not complexity.

---

## Guiding Question for Every Feature

> “Does this move us closer to **paid, verifiable agreements**  
> without increasing legal or operational risk?”

If the answer is no, it does not belong in the current phase.

---

## Final Note

This project prioritizes:
- Focus
- Revenue
- Proof
- Incremental trust

Not:
- Over-engineering
- Premature social features
- Heavy compliance too early

When in doubt: **return to this file.**
