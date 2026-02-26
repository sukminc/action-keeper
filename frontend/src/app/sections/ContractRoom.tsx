"use client";

import { useEffect, useMemo, useState } from "react";

type Agreement = {
  id: string;
  status: string;
  negotiation_state: string;
  party_a_label?: string;
  party_b_label?: string;
  terms?: {
    stake_pct?: number;
    markup?: number;
    payout_basis?: string;
    buy_in_amount?: number;
    bullet_cap?: number;
    event_date?: string;
  };
  pending_terms?: {
    stake_pct?: number;
    markup?: number;
    payout_basis?: string;
    bullet_cap?: number;
  };
};

type EventItem = {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

type ContractRoomProps = {
  agreementId: string;
};

export default function ContractRoom({ agreementId }: ContractRoomProps) {
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [selectedActor, setSelectedActor] = useState<string>("");
  const [counterStake, setCounterStake] = useState<string>("");
  const [counterMarkup, setCounterMarkup] = useState<string>("");
  const [counterPayoutBasis, setCounterPayoutBasis] = useState<string>("gross_payout");
  const [counterBulletCap, setCounterBulletCap] = useState<string>("1");
  const [counterNotes, setCounterNotes] = useState<string>("");
  const [events, setEvents] = useState<EventItem[]>([]);

  const resolveApiBase = () => "";

  const loadAgreement = async () => {
    const apiBase = resolveApiBase();
    try {
      const response = await fetch(`${apiBase}/api/v1/agreements/${agreementId}`, {
        headers: { Authorization: "Bearer dev-token" },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setStatusMsg(`Failed to load agreement: ${errorData.detail || response.status}`);
        return;
      }
      const data = await response.json();
      setAgreement(data);
      setCounterStake(String(data.pending_terms?.stake_pct ?? data.terms?.stake_pct ?? ""));
      setCounterMarkup(String(data.pending_terms?.markup ?? data.terms?.markup ?? "1.0"));
      setCounterPayoutBasis(String(data.pending_terms?.payout_basis ?? data.terms?.payout_basis ?? "gross_payout"));
      setCounterBulletCap(String(data.pending_terms?.bullet_cap ?? data.terms?.bullet_cap ?? "1"));
      if (!selectedActor) {
        setSelectedActor(data.party_b_label || data.party_a_label || "");
      }
    } catch (err) {
      setStatusMsg(`Failed to load agreement: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgreement();
    const timer = setInterval(loadAgreement, 5000);
    return () => clearInterval(timer);
  }, [agreementId]);

  const loadEvents = async () => {
    const apiBase = resolveApiBase();
    try {
      const response = await fetch(`${apiBase}/api/v1/agreements/${agreementId}/events`, {
        headers: { Authorization: "Bearer dev-token" },
      });
      if (!response.ok) return;
      const data = await response.json();
      setEvents(data);
    } catch {
      // Keep silent for non-critical timeline fetch errors
    }
  };

  useEffect(() => {
    loadEvents();
    const timer = setInterval(loadEvents, 5000);
    return () => clearInterval(timer);
  }, [agreementId]);

  const actorChoices = useMemo(() => {
    const values = [agreement?.party_a_label, agreement?.party_b_label].filter(Boolean) as string[];
    return Array.from(new Set(values));
  }, [agreement?.party_a_label, agreement?.party_b_label]);

  const canAct = Boolean(selectedActor && actorChoices.includes(selectedActor));

  const submitAccept = async () => {
    if (!canAct) {
      setStatusMsg("먼저 acting party를 선택해 주세요.");
      return;
    }
    const apiBase = resolveApiBase();
    const response = await fetch(`${apiBase}/api/v1/agreements/${agreementId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer dev-token" },
      body: JSON.stringify({ accepter_label: selectedActor }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      setStatusMsg(`Accept failed: ${errorData.detail || response.status}`);
      return;
    }
    const data = await response.json();
    setStatusMsg(
      data.negotiation_state === "accepted"
        ? "양측 합의 완료: Agreement가 active 상태입니다."
        : "한쪽만 확인 완료: 상대방의 Accept를 기다리는 중입니다."
    );
    await loadAgreement();
  };

  const submitCounter = async () => {
    if (!canAct) {
      setStatusMsg("먼저 acting party를 선택해 주세요.");
      return;
    }
    const stake = Number(counterStake);
    const markup = Number(counterMarkup);
    const bulletCap = Number(counterBulletCap);
    if (!Number.isFinite(stake) || stake <= 0) {
      setStatusMsg("Counter stake %를 올바르게 입력해 주세요.");
      return;
    }
    if (stake < 1 || stake > 100) {
      setStatusMsg("Counter stake %는 1~100 범위여야 합니다.");
      return;
    }
    if (!Number.isFinite(markup) || markup < 0.5 || markup > 2.0) {
      setStatusMsg("Counter markup은 0.5 ~ 2.0 사이여야 합니다.");
      return;
    }
    if (!Number.isFinite(bulletCap) || bulletCap < 1) {
      setStatusMsg("Bullet cap은 1 이상이어야 합니다.");
      return;
    }
    const apiBase = resolveApiBase();
    const response = await fetch(`${apiBase}/api/v1/agreements/${agreementId}/counter`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer dev-token" },
      body: JSON.stringify({
        proposer_label: selectedActor,
        terms: {
          ...(agreement?.terms || {}),
          stake_pct: stake,
          markup,
          payout_basis: counterPayoutBasis,
          bullet_cap: bulletCap,
        },
        counter_notes: counterNotes || "Counter from contract room",
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      setStatusMsg(`Counter failed: ${errorData.detail || response.status}`);
      return;
    }
    setStatusMsg("Counter sent.");
    await loadAgreement();
    await loadEvents();
  };

  const submitDecline = async () => {
    if (!canAct) {
      setStatusMsg("먼저 acting party를 선택해 주세요.");
      return;
    }
    const apiBase = resolveApiBase();
    const response = await fetch(`${apiBase}/api/v1/agreements/${agreementId}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer dev-token" },
      body: JSON.stringify({
        decliner_label: selectedActor,
        reason: "Declined in shared contract room",
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      setStatusMsg(`Decline failed: ${errorData.detail || response.status}`);
      return;
    }
    setStatusMsg("Agreement declined.");
    await loadAgreement();
    await loadEvents();
  };

  const downloadReceipt = async () => {
    const apiBase = resolveApiBase();
    const response = await fetch(`${apiBase}/api/v1/agreements/${agreementId}/artifact`, {
      headers: { Authorization: "Bearer dev-token" },
    });
    if (!response.ok) {
      setStatusMsg("영수증 다운로드에 실패했습니다.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agreement-${agreementId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <p className="status-text">Loading contract...</p>;
  }

  if (!agreement) {
    return <p className="status-text">Contract not found.</p>;
  }

  return (
    <section className="card accent" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <header className="card-header">
        <h2 className="card-title">Shared Contract Room</h2>
        <p className="card-subtitle">
          Agreement #{agreement.id} · State {agreement.negotiation_state} ({agreement.status})
        </p>
      </header>

      <div className="card secondary" style={{ padding: "0.9rem" }}>
        <p className="status-text" style={{ margin: "0 0 0.35rem 0" }}>
          Locked: player, backer, buy-in amount
        </p>
        <p style={{ margin: 0 }}>
          Stake {agreement.terms?.stake_pct ?? "-"}% · Buy-in ${agreement.terms?.buy_in_amount ?? "-"} · Basis{" "}
          {agreement.terms?.payout_basis ?? "TBD"} · Markup {agreement.terms?.markup ?? "-"}x
        </p>
        {agreement.pending_terms?.stake_pct !== undefined && (
          <p className="status-text" style={{ margin: "0.4rem 0 0" }}>
            Pending counter: stake {agreement.pending_terms.stake_pct}% / markup{" "}
            {agreement.pending_terms.markup ?? "-"}x
          </p>
        )}
      </div>

      <div className="form-grid" style={{ marginBottom: 0 }}>
        <select
          className="form-field"
          value={selectedActor}
          onChange={(e) => setSelectedActor(e.target.value)}
        >
          <option value="">Select acting party</option>
          {actorChoices.map((actor) => (
            <option key={actor} value={actor}>
              {actor}
            </option>
          ))}
        </select>
        <input
          className="form-field"
          type="number"
          placeholder="Counter stake %"
          value={counterStake}
          onChange={(e) => setCounterStake(e.target.value)}
        />
        <input
          className="form-field"
          type="number"
          step="0.1"
          min="0.5"
          max="2.0"
          placeholder="Counter markup (0.5 - 2.0)"
          value={counterMarkup}
          onChange={(e) => setCounterMarkup(e.target.value)}
        />
        <select
          className="form-field"
          value={counterPayoutBasis}
          onChange={(e) => setCounterPayoutBasis(e.target.value)}
        >
          <option value="gross_payout">Gross payout</option>
          <option value="net_profit">Net profit</option>
          <option value="diluted_total">Diluted total</option>
        </select>
        <input
          className="form-field"
          type="number"
          min="1"
          step="1"
          placeholder="Counter bullet cap (1=freezeout)"
          value={counterBulletCap}
          onChange={(e) => setCounterBulletCap(e.target.value)}
        />
      </div>
      <textarea
        className="form-field"
        placeholder="Counter notes (optional)"
        value={counterNotes}
        onChange={(e) => setCounterNotes(e.target.value)}
      />

      <div className="pill-row">
        <button
          className="btn btn-secondary"
          onClick={submitAccept}
          disabled={agreement.negotiation_state === "accepted" || agreement.negotiation_state === "declined"}
        >
          Accept
        </button>
        <button
          className="btn btn-outline"
          onClick={submitCounter}
          disabled={agreement.negotiation_state === "accepted" || agreement.negotiation_state === "declined"}
        >
          Counter
        </button>
        <button
          className="btn btn-outline"
          onClick={submitDecline}
          style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
          disabled={agreement.negotiation_state === "accepted" || agreement.negotiation_state === "declined"}
        >
          Decline
        </button>
        <button
          className="btn btn-primary"
          onClick={downloadReceipt}
          disabled={agreement.negotiation_state !== "accepted"}
        >
          Download Receipt
        </button>
      </div>

      {statusMsg && <p className="status-text">{statusMsg}</p>}
      <a className="link" href={`/contract/${agreement.id}`}>
        Share this URL: /contract/{agreement.id}
      </a>

      <div className="card secondary" style={{ padding: "0.9rem" }}>
        <p className="card-title" style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
          Contract Activity Log
        </p>
        <div className="vault-list">
          {events.length === 0 && <p className="status-text">No events yet.</p>}
          {events
            .slice()
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map((evt) => {
              const payload = evt.payload || {};
              let message = evt.event_type;
              if (evt.event_type === "negotiation_countered") {
                const proposer = String(payload.proposer || "Unknown");
                const changes = (payload.term_changes as Record<string, { from: unknown; to: unknown }>) || {};
                const changeText = Object.entries(changes)
                  .map(([k, v]) => `${k}: ${String(v.from ?? "-")} -> ${String(v.to ?? "-")}`)
                  .join(", ");
                message = `${proposer} countered${changeText ? ` (${changeText})` : ""}`;
              } else if (evt.event_type === "agreement_accepted") {
                const accepter = String(payload.accepter || "Unknown");
                const both = Boolean(payload.both_confirmed);
                message = `${accepter} accepted${both ? " (fully agreed)" : " (waiting for other party)"}`;
              } else if (evt.event_type === "agreement_declined") {
                const decliner = String(payload.decliner || "Unknown");
                const reason = String(payload.reason || "");
                message = `${decliner} declined${reason ? ` (${reason})` : ""}`;
              } else if (evt.event_type === "agreement_created") {
                message = "Agreement created";
              }
              return (
                <div key={evt.id} className="vault-card">
                  <p style={{ margin: 0 }}>{message}</p>
                  <p className="status-text" style={{ margin: "0.35rem 0 0" }}>
                    {new Date(evt.created_at).toLocaleString("en-US", {
                      timeZone: "America/New_York",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}{" "}
                    EST
                  </p>
                </div>
              );
            })}
        </div>
      </div>
    </section>
  );
}
