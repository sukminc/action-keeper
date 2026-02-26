"use client";

import { useMemo, useState } from "react";

const initialTerms = {
  stake_pct: "",
  buy_in_amount: "",
  markup: "1.0",
  payout_basis: "gross_payout",
  party_a_label: "",
  party_b_label: "",
};

const payoutBasisLabels: Record<string, string> = {
  gross_payout: "Gross payout (total cash received)",
  net_profit: "Net profit after buy-ins",
  diluted_total: "Diluted total (per bullet exposure)",
};

export default function ContractBuilder() {
  const [terms, setTerms] = useState(initialTerms);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAgreementId, setCreatedAgreementId] = useState<string | null>(null);

  const handleTermsChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setTerms({ ...terms, [e.target.name]: e.target.value });
  };

  const requiredMissing = useMemo(() => {
    const missing: string[] = [];
    if (!terms.party_a_label) missing.push("Your name");
    if (!terms.party_b_label) missing.push("Backer name");
    if (!terms.stake_pct) missing.push("Stake %");
    if (!terms.buy_in_amount) missing.push("Buy-in amount");
    const markup = parseFloat(terms.markup || "1");
    if (Number.isNaN(markup) || markup < 0.5 || markup > 2) {
      missing.push("Markup between 0.5× and 2.0×");
    }
    return missing;
  }, [terms]);

  const summary = useMemo(() => {
    if (!terms.party_a_label && !terms.party_b_label) {
      return "Document the freeze-out promise before cards are in the air.";
    }
    const stake = terms.stake_pct || "___";
    const buyIn = terms.buy_in_amount ? `$${terms.buy_in_amount}` : "$____";
    const basis = payoutBasisLabels[terms.payout_basis] || "payout basis TBD";
    const markup = parseFloat(terms.markup || "1").toFixed(2);
    return `${terms.party_a_label || "Player"} offers ${stake}% in a ${buyIn} freeze-out at ${markup}× markup. ${
      terms.party_b_label || "Backer"
    } receives ${stake || "___"}% of ${basis}.`;
  }, [terms]);

  const resolveApiBase = () => {
    // Use relative path so Next.js rewrites can handle it
    return "";
  };

  async function sendOffer() {
    if (requiredMissing.length) {
      setStatus(`Please fill: ${requiredMissing.join(", ")}`);
      return;
    }
    const apiBase = resolveApiBase();
    setIsSubmitting(true);
    setStatus("Sending offer to backer...");
    const url = `${apiBase}/api/v1/agreements`;
    try {
      console.log(`Sending request to: ${url}`);
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer dev-token" },
        body: JSON.stringify({
          payment_id: "offer-intent",
          agreement_type: "poker_staking",
          terms_version: "freezeout-v1",
          terms: {
            stake_pct: Number(terms.stake_pct || 0),
            buy_in_amount: Number(terms.buy_in_amount || 0),
            bullet_cap: 1,
            markup: parseFloat(terms.markup || "1"),
            payout_basis: terms.payout_basis,
            party_a_label: terms.party_a_label,
            party_b_label: terms.party_b_label,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error("API Error:", data);
        throw new Error(data.detail || "Offer failed");
      }
      setCreatedAgreementId(data.id);
      setStatus(`Offer ${data.id} queued. Share the link so ${terms.party_b_label || "your backer"} can respond.`);
      setTerms(initialTerms);
    } catch (err) {
      console.error("Fetch Error:", err);
      setStatus(`Error hitting ${url}: ${(err as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="card accent" style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
      <header className="card-header">
        <h2 className="card-title">Player Offer Composer</h2>
        <p className="card-subtitle">Freeze-out template: max 1 bullet, markup 0.5×–2×.</p>
      </header>
      <div className="form-grid">
        <input
          name="party_a_label"
          placeholder="Your name (Player)"
          value={terms.party_a_label}
          onChange={handleTermsChange}
          className="form-field"
        />
        <input
          name="party_b_label"
          placeholder="Backer name"
          value={terms.party_b_label}
          onChange={handleTermsChange}
          className="form-field"
        />
        <input
          name="stake_pct"
          type="number"
          min="0"
          max="100"
          step="0.1"
          placeholder="Stake % (e.g., 10)"
          value={terms.stake_pct}
          onChange={handleTermsChange}
          className="form-field"
        />
        <input
          name="buy_in_amount"
          type="number"
          min="0"
          placeholder="Buy-in amount (USD)"
          value={terms.buy_in_amount}
          onChange={handleTermsChange}
          className="form-field"
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          <label style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Markup (0.5× – 2.0×)</label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            name="markup"
            value={terms.markup}
            onChange={handleTermsChange}
            className="form-field"
            style={{ accentColor: "var(--accent-secondary)" }}
          />
          <span className="status-text">Current markup: {parseFloat(terms.markup || "1").toFixed(2)}×</span>
        </div>
        <select
          name="payout_basis"
          value={terms.payout_basis}
          onChange={handleTermsChange}
          className="form-field"
        >
          {Object.entries(payoutBasisLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="card secondary" style={{ padding: "1rem" }}>
        <p className="card-title" style={{ fontSize: "1rem" }}>
          Offer preview
        </p>
        <p>{summary}</p>
        <p className="status-text">
          Share the resulting link so your backer can accept or counter. Funds confirmation happens later—after both
          sides agree.
        </p>
      </div>
      <button
        onClick={sendOffer}
        className="btn btn-primary"
        style={{ width: "100%" }}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Sending…" : "Send Offer to Backer (v2)"}
      </button>
      {status && <p className="status-text">{status}</p>}
      {createdAgreementId && (
        <div className="card secondary" style={{ padding: "0.9rem" }}>
          <p className="card-title" style={{ fontSize: "1rem" }}>
            Shared contract link
          </p>
          <p className="status-text" style={{ marginTop: "0.35rem" }}>
            Open this same page on both devices to track status and complete agreement.
          </p>
          <a className="link" href={`/contract/${createdAgreementId}`}>
            /contract/{createdAgreementId}
          </a>
        </div>
      )}
    </section>
  );
}
