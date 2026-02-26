"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type Agreement = {
  id: string;
  status: string;
  negotiation_state: string;
  last_proposed_by?: string;
  party_a_label?: string;
  party_b_label?: string;
  terms?: {
    stake_pct?: number;
    markup?: number;
    payout_basis?: string;
    buy_in_amount?: number;
    bullet_cap?: number;
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
  const [isCounterEditing, setIsCounterEditing] = useState(false);

  const [events, setEvents] = useState<EventItem[]>([]);

  const resolveApiBase = () => "";

  const actorChoices = useMemo(() => {
    const values = [agreement?.party_a_label, agreement?.party_b_label].filter(Boolean) as string[];
    return Array.from(new Set(values));
  }, [agreement?.party_a_label, agreement?.party_b_label]);

  const nextCounterActor = useMemo(() => {
    if (!agreement) return "";
    const a = agreement.party_a_label || "";
    const b = agreement.party_b_label || "";
    if (!a || !b) return "";
    const last = agreement.last_proposed_by || "";
    if (!last || last === a) return b;
    if (last === b) return a;
    return "";
  }, [agreement]);

  const canAct = Boolean(selectedActor && actorChoices.includes(selectedActor));
  const canCounterByTurn = !nextCounterActor || selectedActor === nextCounterActor;
  const isLocked = agreement?.negotiation_state === "accepted" || agreement?.negotiation_state === "declined";

  const previewTerms = useMemo(() => {
    if (!agreement) return null;
    return {
      stake_pct: Number(counterStake || agreement.terms?.stake_pct || 0),
      markup: Number(counterMarkup || agreement.terms?.markup || 1),
      payout_basis: counterPayoutBasis || agreement.terms?.payout_basis || "gross_payout",
      bullet_cap: Number(counterBulletCap || agreement.terms?.bullet_cap || 1),
      buy_in_amount: Number(agreement.terms?.buy_in_amount || 0),
    };
  }, [agreement, counterStake, counterMarkup, counterPayoutBasis, counterBulletCap]);

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
      // non-critical
    }
  };

  useEffect(() => {
    loadAgreement();
    loadEvents();
    const agreementTimer = setInterval(loadAgreement, 5000);
    const eventsTimer = setInterval(loadEvents, 5000);
    return () => {
      clearInterval(agreementTimer);
      clearInterval(eventsTimer);
    };
  }, [agreementId]);

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
        : "한쪽 확인 완료: 상대방의 Accept를 기다리는 중입니다."
    );
    await loadAgreement();
    await loadEvents();
  };

  const submitCounter = async () => {
    if (!canAct) {
      setStatusMsg("먼저 acting party를 선택해 주세요.");
      return;
    }
    if (!canCounterByTurn) {
      setStatusMsg(`지금은 ${nextCounterActor} 님 차례입니다.`);
      return;
    }

    const stake = Number(counterStake);
    const markup = Number(counterMarkup);
    const bulletCap = Number(counterBulletCap);
    if (!Number.isFinite(stake) || stake < 1 || stake > 100) {
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

    const nextActor = actorChoices.find((actor) => actor !== selectedActor);
    setIsCounterEditing(false);
    setStatusMsg(nextActor ? `Counter sent. Next turn: ${nextActor}` : "Counter sent.");
    if (nextActor) setSelectedActor(nextActor);
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

  if (loading) return <p className="status-text">Loading contract...</p>;
  if (!agreement) return <p className="status-text">Contract not found.</p>;

  return (
    <section className="card accent" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <header className="card-header">
        <h2 className="card-title">Shared Contract Room</h2>
        <p className="card-subtitle">
          Agreement #{agreement.id} · State {agreement.negotiation_state} ({agreement.status})
        </p>
        {nextCounterActor && !isLocked && (
          <p className="status-text" style={{ marginTop: "0.45rem" }}>
            Next counter turn: {nextCounterActor}
          </p>
        )}
      </header>

      <div className="form-grid" style={{ marginBottom: 0 }}>
        <select className="form-field" value={selectedActor} onChange={(e) => setSelectedActor(e.target.value)}>
          <option value="">Select acting party</option>
          {actorChoices.map((actor) => (
            <option key={actor} value={actor}>
              {actor}
            </option>
          ))}
        </select>
      </div>

      {previewTerms && (
        <div className="card secondary" style={{ padding: "0.9rem" }}>
          <p className="card-title" style={{ fontSize: "1rem", marginBottom: "0.45rem" }}>
            Live Offer Preview (before lock)
          </p>
          <p style={{ margin: 0 }}>
            Stake {previewTerms.stake_pct}% · Buy-in ${previewTerms.buy_in_amount} · Markup {previewTerms.markup}x · Basis{" "}
            {previewTerms.payout_basis} · Bullet cap {previewTerms.bullet_cap}
          </p>
          <p className="status-text" style={{ margin: "0.45rem 0 0" }}>
            Backer exposure: $
            {((previewTerms.buy_in_amount * previewTerms.stake_pct) / 100).toLocaleString("en-US", {
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      )}

      <div className="pill-row">
        <button className="btn btn-secondary" onClick={submitAccept} disabled={isLocked}>
          Accept
        </button>
        <button
          className="btn btn-outline"
          onClick={() => {
            setIsCounterEditing((prev) => !prev);
            setStatusMsg(null);
          }}
          disabled={isLocked || !canCounterByTurn}
        >
          {isCounterEditing ? "Close Counter Edit" : "Counter"}
        </button>
        <button
          className="btn btn-outline"
          onClick={submitDecline}
          style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
          disabled={isLocked}
        >
          Decline
        </button>
        {agreement.negotiation_state === "accepted" && (
          <button className="btn btn-primary" onClick={downloadReceipt}>
            Download Receipt
          </button>
        )}
      </div>

      {isCounterEditing && (
        <div className="card secondary" style={{ padding: "0.9rem" }}>
          <p className="card-title" style={{ fontSize: "1rem", marginBottom: "0.55rem" }}>
            Counter Edit
          </p>
          <div className="form-grid" style={{ marginBottom: "0.5rem" }}>
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
          <div className="pill-row" style={{ marginTop: "0.6rem" }}>
            <button className="btn btn-primary" onClick={submitCounter} disabled={!canCounterByTurn || isLocked}>
              Send Counter Update
            </button>
          </div>
        </div>
      )}

      {statusMsg && <p className="status-text">{statusMsg}</p>}

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
              let messageNode: ReactNode = evt.event_type;
              if (evt.event_type === "negotiation_countered") {
                const proposer = String(payload.proposer || "Unknown");
                const changes = (payload.term_changes as Record<string, { from: unknown; to: unknown }>) || {};
                messageNode = (
                  <span>
                    <strong>{proposer}</strong> countered{" "}
                    {Object.keys(changes).length > 0 && (
                      <>
                        :{" "}
                        {Object.entries(changes).map(([k, v], idx) => (
                          <span key={`${evt.id}-${k}`}>
                            {idx > 0 ? ", " : ""}
                            {k} <s>{String(v.from ?? "-")}</s> -&gt; <strong>{String(v.to ?? "-")}</strong>
                          </span>
                        ))}
                      </>
                    )}
                  </span>
                );
              } else if (evt.event_type === "agreement_accepted") {
                const accepter = String(payload.accepter || "Unknown");
                const both = Boolean(payload.both_confirmed);
                messageNode = `${accepter} accepted${both ? " (fully agreed)" : " (waiting for other party)"}`;
              } else if (evt.event_type === "agreement_declined") {
                const decliner = String(payload.decliner || "Unknown");
                const reason = String(payload.reason || "");
                messageNode = `${decliner} declined${reason ? ` (${reason})` : ""}`;
              } else if (evt.event_type === "agreement_created") {
                messageNode = "Agreement created";
              }
              return (
                <div key={evt.id} className="vault-card">
                  <p style={{ margin: 0 }}>{messageNode}</p>
                  <p className="status-text" style={{ margin: "0.35rem 0 0" }}>
                    {new Date(evt.created_at).toLocaleString("en-US", {
                      timeZone: "America/New_York",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}{" "}
                    ET
                  </p>
                </div>
              );
            })}
        </div>
      </div>
    </section>
  );
}
