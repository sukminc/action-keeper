"use client";

import { useMemo, useState } from "react";

const initialTerms = {
  stake_pct: "",
  buy_in_amount: "",
  markup: "1.0",
  payout_basis: "gross_payout",
  event_date: "",
  party_a_label: "",
  party_b_label: "",
  notes: "",
};

const payoutBasisLabels: Record<string, string> = {
  gross_payout: "Gross payout (total cash received)",
  net_profit: "Net profit after buy-ins",
  diluted_total: "Diluted total (per bullet exposure)",
};

export default function ContractBuilder() {
  const [terms, setTerms] = useState(initialTerms);
  const [status, setStatus] = useState<string | null>(null);
  const [playerResponse, setPlayerResponse] = useState<"accept" | "counter" | "none">("none");
  const [responseNotes, setResponseNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requiredMissing = useMemo(() => {
    const missing: string[] = [];
    if (!terms.party_a_label) missing.push("Your name");
    if (!terms.party_b_label) missing.push("Backer name");
    if (!terms.stake_pct) missing.push("Stake %");
    if (!terms.buy_in_amount) missing.push("Buy-in amount");
    if (!terms.event_date) missing.push("Event date");
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
    const eventDay = terms.event_date || "event date TBA";
    const basis = payoutBasisLabels[terms.payout_basis] || "payout basis TBD";
    const markup = parseFloat(terms.markup || "1").toFixed(2);
    return `${terms.party_a_label || "Player"} offers ${stake}% in a ${buyIn} freeze-out (${eventDay}) at ${markup}× markup. ${
      terms.party_b_label || "Backer"
    } receives ${stake || "___"}% of ${basis}.`;
  }, [terms]);

  const resolveApiBase = () => {
    if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.length > 0) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "";
  };

  async function sendOffer() {
    if (requiredMissing.length) {
      setStatus(`Please fill: ${requiredMissing.join(", ")}`);
      return;
    }
    const apiBase = resolveApiBase();
    if (!apiBase) {
      setStatus("API base URL is missing. Set NEXT_PUBLIC_API_URL.");
      return;
    }
    setIsSubmitting(true);
    setStatus("Sending offer to backer...");
    try {
      const response = await fetch(`${apiBase}/api/v1/agreements`, {
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
            event_date: terms.event_date,
            party_a_label: terms.party_a_label,
            party_b_label: terms.party_b_label,
            notes: terms.notes,
            player_response: playerResponse,
            response_notes: responseNotes || undefined,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Offer failed");
      }
      setStatus(`Offer ${data.id} queued. Share the link so ${terms.party_b_label || "your backer"} can respond.`);
      setTerms(initialTerms);
      setPlayerResponse("none");
      setResponseNotes("");
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="card accent" style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
      <header className="card-header">
        <h2 className="card-title">Player Offer Composer</h2>
        <p className="card-subtitle">Freeze-out template: max 1 bullet, single event date, markup 0.5×–2×.</p>
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
        <input
          name="event_date"
          type="date"
          placeholder="Event date"
          value={terms.event_date}
          onChange={handleTermsChange}
          className="form-field"
        />
      </div>
      <textarea
        name="notes"
        placeholder="Extra clauses (markup explanation, swap notes, etc.)"
        value={terms.notes}
        onChange={handleTermsChange}
        className="form-field"
        style={{ minHeight: "90px" }}
      />
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
      <div className="card" style={{ padding: "1rem" }}>
        <p className="card-title" style={{ fontSize: "1rem" }}>
          Respond to a backer counter (optional)
        </p>
        <p className="status-text">
          If David counters from the buyer hub, pick how you want to respond before sending a fresh draft.
        </p>
        <div className="pill-row" style={{ width: "100%" }}>
          <button
            onClick={() => setPlayerResponse("accept")}
            className="btn btn-secondary"
            style={playerResponse === "accept" ? { border: "1px solid var(--success)" } : {}}
          >
            Accept Counter
          </button>
          <button
            onClick={() => setPlayerResponse("counter")}
            className="btn btn-outline"
            style={playerResponse === "counter" ? { border: "1px solid var(--accent)" } : {}}
          >
            Counter Again
          </button>
        </div>
        {playerResponse === "counter" && (
          <textarea
            className="form-field"
            style={{ marginTop: "0.75rem" }}
            placeholder="Describe your counter (e.g., 5% net but extend payouts by 7 days)."
            value={responseNotes}
            onChange={(e) => setResponseNotes(e.target.value)}
          />
        )}
      </div>
      <button
        onClick={sendOffer}
        className="btn btn-primary"
        style={{ width: "100%" }}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Sending…" : "Send Offer to Backer"}
      </button>
      {status && <p className="status-text">{status}</p>}
    </section>
  );
}
