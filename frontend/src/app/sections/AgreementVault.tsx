"use client";

import { useEffect, useState } from "react";

type Agreement = {
  id: string;
  status: string;
  negotiation_state: string;
  party_a_label?: string;
  party_b_label?: string;
  stake_percent?: number;
  terms?: {
    stake_pct?: number;
    payout_basis?: string;
    buy_in_amount?: number;
    bullet_cap?: number;
    event_date?: string;
    party_a_label?: string;
    party_b_label?: string;
  };
  qr_payload?: { verification_url: string };
  artifact?: { verification_url: string };
};

export default function AgreementVault() {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [filter, setFilter] = useState<
    "all" | "ready" | "countered" | "awaiting_confirmation" | "declined"
  >("all");
  const [counteringId, setCounteringId] = useState<string | null>(null);
  const [counterStake, setCounterStake] = useState<string>("");
  const [counterNotes, setCounterNotes] = useState<string>("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const resolveApiBase = () => {
    return "";
  };

  const load = async () => {
    const apiBase = resolveApiBase();
    const url = `${apiBase}/api/v1/agreements`;
    try {
      const response = await fetch(url, {
        headers: { Authorization: "Bearer dev-token" },
      });
      if (response.ok) {
        setAgreements(await response.json());
      } else {
        const errorData = await response.json().catch(() => ({}));
        setStatusMsg(`Failed to load from ${url}: ${response.status} ${JSON.stringify(errorData)}`);
      }
    } catch (err) {
      console.error("Load Error:", err);
      setStatusMsg(`Error loading from ${url}: ${(err as Error).message}`);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAccept = async (id: string, label: string) => {
    const apiBase = resolveApiBase();
    setStatusMsg(`Accepting agreement ${id}...`);
    try {
      const response = await fetch(`${apiBase}/api/v1/agreements/${id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer dev-token" },
        body: JSON.stringify({ accepter_label: label }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.negotiation_state === "accepted") {
          setStatusMsg("양측 확인 완료: Agreement가 활성화되었습니다.");
        } else {
          setStatusMsg("한쪽 확인 완료: 상대방 확인을 기다리는 중입니다.");
        }
        load();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setStatusMsg(`Failed to accept agreement: ${errorData.detail || response.status}`);
      }
    } catch (err) {
      setStatusMsg("Error accepting agreement.");
    }
  };

  const handleCounter = async (agreement: Agreement) => {
    const apiBase = resolveApiBase();
    setStatusMsg(`Sending counter for ${agreement.id}...`);
    try {
      const response = await fetch(`${apiBase}/api/v1/agreements/${agreement.id}/counter`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer dev-token" },
        body: JSON.stringify({
          proposer_label: agreement.party_b_label || "Backer",
          terms: {
            ...agreement.terms,
            stake_pct: Number(counterStake),
          },
          counter_notes: counterNotes,
        }),
      });
      if (response.ok) {
        setStatusMsg("Counter proposed!");
        setCounteringId(null);
        setCounterStake("");
        setCounterNotes("");
        load();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setStatusMsg(`Failed to propose counter: ${errorData.detail || response.status}`);
      }
    } catch (err) {
      setStatusMsg("Error proposing counter.");
    }
  };

  const handleDecline = async (agreement: Agreement) => {
    const apiBase = resolveApiBase();
    setStatusMsg(`Declining agreement ${agreement.id}...`);
    try {
      const response = await fetch(`${apiBase}/api/v1/agreements/${agreement.id}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer dev-token" },
        body: JSON.stringify({
          decliner_label: agreement.party_b_label || "Backer",
          reason: "Backer declined in buyer vault",
        }),
      });
      if (response.ok) {
        setStatusMsg("Agreement declined.");
        load();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setStatusMsg(`Failed to decline agreement: ${errorData.detail || response.status}`);
      }
    } catch (err) {
      setStatusMsg("Error declining agreement.");
    }
  };

  const filteredAgreements = agreements.filter((agreement) => {
    if (filter === "all") return true;
    if (filter === "ready") {
      return agreement.negotiation_state === "accepted";
    }
    if (filter === "countered") {
      return agreement.negotiation_state === "countered";
    }
    if (filter === "awaiting_confirmation") {
      return agreement.negotiation_state === "awaiting_confirmation";
    }
    return agreement.negotiation_state === "declined";
  });

  return (
    <section className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <header className="card-header" style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <h2 className="card-title">Agreement Vault</h2>
          <p className="card-subtitle">
            Backer view: review player drafts, request changes, and pull receipts.
          </p>
        </div>
        <div className="pill-row" style={{ justifyContent: "flex-end" }}>
          <button
            onClick={() => setFilter("all")}
            className="btn btn-outline"
            style={filter === "all" ? { borderColor: "var(--accent)", color: "var(--accent)" } : {}}
          >
            All
          </button>
          <button
            onClick={() => setFilter("ready")}
            className="btn btn-outline"
            style={filter === "ready" ? { borderColor: "var(--success)", color: "var(--success)" } : {}}
          >
            Ready
          </button>
          <button
            onClick={() => setFilter("countered")}
            className="btn btn-outline"
            style={filter === "countered" ? { borderColor: "var(--danger)", color: "var(--danger)" } : {}}
          >
            Negotiating
          </button>
          <button
            onClick={() => setFilter("awaiting_confirmation")}
            className="btn btn-outline"
            style={
              filter === "awaiting_confirmation"
                ? { borderColor: "var(--accent-secondary)", color: "var(--accent-secondary)" }
                : {}
            }
          >
            Awaiting Confirm
          </button>
          <button
            onClick={() => setFilter("declined")}
            className="btn btn-outline"
            style={filter === "declined" ? { borderColor: "var(--danger)", color: "var(--danger)" } : {}}
          >
            Declined
          </button>
          <button onClick={load} className="btn btn-outline" style={{ padding: "0.55rem 1.2rem" }}>
            Refresh (v2)
          </button>
        </div>
      </header>
      {statusMsg && <p className="status-text" style={{ color: "var(--accent)" }}>{statusMsg}</p>}
      <div className="vault-list">
        {filteredAgreements.map((agreement) => (
          <div key={agreement.id} className="vault-card">
            <div style={{ marginBottom: "0.65rem" }}>
              <p style={{ fontWeight: 600, margin: 0 }}>#{agreement.id}</p>
              <p className="status-text" style={{ textTransform: "capitalize" }}>
                State: {agreement.negotiation_state} ({agreement.status})
              </p>
              {agreement.terms && (
                <p className="status-text" style={{ marginTop: "0.35rem" }}>
                  {agreement.stake_percent ?? agreement.terms.stake_pct ?? "–"}% · {agreement.terms.payout_basis ?? "basis TBD"} · Buy-in $
                  {agreement.terms.buy_in_amount ?? "–"} · Event{" "}
                  {agreement.terms.event_date ?? "TBD"}
                </p>
              )}
            </div>
            <div className="vault-actions" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.75rem" }}>
              <div className="pill-row" style={{ width: "100%" }}>
                {agreement.negotiation_state !== "accepted" && agreement.negotiation_state !== "declined" && (
                  <>
                    <button
                      onClick={() => handleAccept(agreement.id, agreement.party_b_label || "Backer")}
                      className="btn btn-secondary"
                      style={{ fontSize: "0.85rem" }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => {
                        setCounteringId(agreement.id);
                        setCounterStake(String(agreement.stake_percent || agreement.terms?.stake_pct || ""));
                      }}
                      className="btn btn-outline"
                      style={{ fontSize: "0.85rem" }}
                    >
                      Counter
                    </button>
                    <button
                      onClick={() => handleDecline(agreement)}
                      className="btn btn-outline"
                      style={{ fontSize: "0.85rem", borderColor: "var(--danger)", color: "var(--danger)" }}
                    >
                      Decline
                    </button>
                  </>
                )}
              </div>

              {counteringId === agreement.id && (
                <div className="card secondary" style={{ width: "100%", padding: "0.75rem", marginTop: "0.5rem" }}>
                  <p className="card-title" style={{ fontSize: "0.9rem" }}>Propose Counter</p>
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <input
                      type="number"
                      placeholder="New Stake %"
                      value={counterStake}
                      onChange={(e) => setCounterStake(e.target.value)}
                      className="form-field"
                      style={{ flex: 1 }}
                    />
                  </div>
                  <textarea
                    placeholder="Counter notes..."
                    value={counterNotes}
                    onChange={(e) => setCounterNotes(e.target.value)}
                    className="form-field"
                    style={{ width: "100%", minHeight: "60px", marginBottom: "0.5rem" }}
                  />
                  <div className="pill-row">
                    <button onClick={() => handleCounter(agreement)} className="btn btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                      Submit Counter
                    </button>
                    <button onClick={() => setCounteringId(null)} className="btn btn-outline" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
