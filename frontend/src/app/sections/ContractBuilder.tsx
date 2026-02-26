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
  gross_payout: "Gross payout",
  net_profit: "Net profit",
  diluted_total: "Diluted total (multi-bullet ready)",
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
    const stake = parseFloat(terms.stake_pct || "");
    if (Number.isNaN(stake) || stake < 1 || stake > 100) {
      missing.push("Stake % between 1 and 100");
    }
    const buyIn = Number((terms.buy_in_amount || "").replace(/,/g, ""));
    if (!Number.isFinite(buyIn) || buyIn <= 0) {
      missing.push("Valid buy-in amount");
    }
    const markup = parseFloat(terms.markup || "1");
    if (Number.isNaN(markup) || markup < 0.5 || markup > 2) {
      missing.push("Markup between 0.5× and 2.0×");
    }
    return missing;
  }, [terms]);

  const buyInValue = useMemo(() => {
    const n = Number((terms.buy_in_amount || "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  }, [terms.buy_in_amount]);

  const stakeValue = useMemo(() => {
    const pct = Number(terms.stake_pct || 0);
    if (!Number.isFinite(pct) || !Number.isFinite(buyInValue)) return 0;
    return (buyInValue * pct) / 100;
  }, [buyInValue, terms.stake_pct]);

  const formatUsd = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
      amount || 0
    );

  const summary = useMemo(() => {
    if (!terms.party_a_label && !terms.party_b_label) {
      return "Build a clean freezeout staking offer for your backer.";
    }
    const stake = terms.stake_pct || "__";
    const buyIn = buyInValue ? formatUsd(buyInValue) : "$__";
    const basis = payoutBasisLabels[terms.payout_basis] || "payout basis TBD";
    const markup = parseFloat(terms.markup || "1").toFixed(2);
    const stakeUsd = stakeValue ? formatUsd(stakeValue) : "$__";
    return `${terms.party_a_label || "Player"} offers ${stake}% of ${buyIn} at ${markup}x markup. ${
      terms.party_b_label || "Backer"
    } exposure is ${stakeUsd} on a freezeout entry. Payout basis: ${basis}.`;
  }, [terms, buyInValue, stakeValue]);

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
    setStatus("Sending offer...");
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
            buy_in_amount: buyInValue,
            bullet_cap: 1,
            markup: parseFloat(terms.markup || "1"),
            payout_basis: terms.payout_basis,
            party_a_label: terms.party_a_label,
            party_b_label: terms.party_b_label,
            tournament_structure: "freezeout",
            timeline_timezone: "America/New_York",
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error("API Error:", data);
        throw new Error(data.detail || "Offer failed");
      }
      setCreatedAgreementId(data.id);
      setStatus(`Offer ${data.id} sent. Share the contract link with ${terms.party_b_label || "your backer"}.`);
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
        <h2 className="card-title">Poker Player Offer</h2>
        <p className="card-subtitle">Freezeout mode today. Multi-bullet support is prepared in backend terms.</p>
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
          min="1"
          max="100"
          step="0.1"
          placeholder="Staking % (1-100)"
          value={terms.stake_pct}
          onChange={handleTermsChange}
          className="form-field"
        />
        <div className="money-input-wrap">
          <span className="money-prefix">$</span>
          <input
            name="buy_in_amount"
            type="number"
            min="1"
            placeholder="Buy-in amount"
            value={terms.buy_in_amount}
            onChange={handleTermsChange}
            className="form-field money-input"
          />
        </div>
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
        <p className="status-text" style={{ marginTop: "0.45rem" }}>
          Stake value now: {terms.stake_pct || "__"}% of {buyInValue ? formatUsd(buyInValue) : "$__"} ={" "}
          {formatUsd(stakeValue)}
        </p>
        <p className="status-text">
          Player, backer, and buy-in are locked as reference. Counter terms can edit stake, markup, payout basis, and
          future bullet logic.
        </p>
      </div>
      <button
        onClick={sendOffer}
        className="btn btn-primary"
        style={{ width: "100%" }}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Sending..." : "Send Contract Offer"}
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
