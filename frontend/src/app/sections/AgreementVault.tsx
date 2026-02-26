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
            Admin monitor view: inspect state changes and open shared contract rooms.
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
                <a className="link" href={`/contract/${agreement.id}`} style={{ alignSelf: "center" }}>
                  Open Shared Contract
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
