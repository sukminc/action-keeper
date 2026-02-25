"use client";

import { useEffect, useState } from "react";

type Agreement = {
  id: string;
  status: string;
  terms?: {
    stake_pct?: number;
    payout_basis?: string;
    buy_in_amount?: number;
    bullet_cap?: number;
    event_date?: string;
  };
  qr_payload?: { verification_url: string };
  artifact?: { verification_url: string };
};

export default function AgreementVault() {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [filter, setFilter] = useState<"all" | "ready" | "countered">("all");

  const resolveApiBase = () => {
    if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.length > 0) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "";
  };

  const load = async () => {
    const apiBase = resolveApiBase();
    if (!apiBase) return;
    const response = await fetch(`${apiBase}/api/v1/agreements`, {
      headers: { Authorization: "Bearer dev-token" },
    });
    if (response.ok) {
      setAgreements(await response.json());
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredAgreements = agreements.filter((agreement) => {
    if (filter === "all") return true;
    if (filter === "ready") {
      return agreement.status === "awaiting_confirmation" || agreement.status === "accepted";
    }
    return agreement.status === "countered";
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
            Needs Change
          </button>
          <button onClick={load} className="btn btn-outline" style={{ padding: "0.55rem 1.2rem" }}>
            Refresh
          </button>
        </div>
      </header>
      <div className="vault-list">
        {filteredAgreements.map((agreement) => (
          <div key={agreement.id} className="vault-card">
            <div style={{ marginBottom: "0.65rem" }}>
              <p style={{ fontWeight: 600, margin: 0 }}>#{agreement.id}</p>
              <p className="status-text" style={{ textTransform: "capitalize" }}>
                Status: {agreement.status}
              </p>
              {agreement.terms && (
                <p className="status-text" style={{ marginTop: "0.35rem" }}>
                  {agreement.terms.stake_pct ?? "–"}% · {agreement.terms.payout_basis ?? "basis TBD"} · Buy-in $
                  {agreement.terms.buy_in_amount ?? "–"} · Bullets {agreement.terms.bullet_cap ?? "–"} · Event{" "}
                  {agreement.terms.event_date ?? "TBD"}
                </p>
              )}
            </div>
            <div className="vault-actions">
              {agreement.status === "countered" && (
                <span className="status-text" style={{ color: "var(--danger)" }}>
                  Player requests change. Reply via your buyer tools (API or upcoming UI).
                </span>
              )}
              {agreement.qr_payload && (
                <a href={agreement.qr_payload.verification_url} className="link">
                  Open Verify Link
                </a>
              )}
              {agreement.artifact && (
                <a href={agreement.artifact.verification_url} className="link">
                  Download Receipt PDF
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
