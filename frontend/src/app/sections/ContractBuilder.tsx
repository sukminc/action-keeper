"use client";

import { useMemo, useState } from "react";

const initialTerms = {
  stake_pct: "",
  buy_in_amount: "",
  bullet_cap: "1",
  payout_basis: "gross_payout",
  event_date: "",
  due_date: "",
  party_a_label: "",
  party_b_label: "",
  notes: "",
  funds_received_at: "",
};

const payoutBasisLabels: Record<string, string> = {
  gross_payout: "Gross payout (total cash received)",
  net_profit: "Net profit after buy-ins",
  diluted_total: "Diluted total (per bullet exposure)",
};

export default function ContractBuilder() {
  const [paymentId, setPaymentId] = useState("");
  const [terms, setTerms] = useState(initialTerms);
  const [status, setStatus] = useState<string | null>(null);
  const [negotiationAction, setNegotiationAction] = useState<"idle" | "counter" | "accepted">("idle");
  const [counterNotes, setCounterNotes] = useState("");

  const handleTermsChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setTerms({ ...terms, [e.target.name]: e.target.value });
  };

  const summary = useMemo(() => {
    if (!terms.party_a_label && !terms.party_b_label) {
      return "Document the promise before play begins.";
    }
    const stake = terms.stake_pct || "___";
    const buyIn = terms.buy_in_amount ? `$${terms.buy_in_amount}` : "$____";
    const eventDay = terms.event_date || "event date TBA";
    const basis = payoutBasisLabels[terms.payout_basis] || "payout basis TBD";
    return `${terms.party_a_label || "Backer"} stakes ${stake}% of ${
      terms.party_b_label || "Player"
    } in ${buyIn} WSOP/Live event (${eventDay}). ${terms.party_b_label || "Player"} promises ${
      stake || "___"
    }% of ${basis}.`;
  }, [terms]);

  const stakeDollarValue = useMemo(() => {
    const pct = Number(terms.stake_pct);
    const buyIn = Number(terms.buy_in_amount);
    if (!pct || !buyIn) {
      return null;
    }
    return ((pct / 100) * buyIn).toFixed(2);
  }, [terms.stake_pct, terms.buy_in_amount]);

  const checklist = [
    {
      label: `Stake ${terms.stake_pct || "___"}% of $${terms.buy_in_amount || "____"} = $${
        stakeDollarValue ?? "____"
      } exposure`,
      checked: Boolean(stakeDollarValue),
    },
    {
      label: `Payout basis: ${payoutBasisLabels[terms.payout_basis] || "TBD"}`,
      checked: Boolean(terms.payout_basis),
    },
    {
      label: `Bullet cap set to ${terms.bullet_cap || "TBD"} and event ${terms.event_date || "TBD"}`,
      checked: Boolean(terms.bullet_cap && terms.event_date),
    },
    {
      label: terms.funds_received_at
        ? `Funds logged at ${new Date(terms.funds_received_at).toLocaleString()}`
        : "Log when funds arrive",
      checked: Boolean(terms.funds_received_at),
    },
  ];

const resolveApiBase = () => {
  if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.length > 0) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
};

async function createPayment() {
  const apiBase = resolveApiBase();
  if (!apiBase) {
    setStatus("API base URL is missing. Set NEXT_PUBLIC_API_URL.");
    return;
  }
  setStatus("Creating checkout session...");
  const response = await fetch(
      `${apiBase}/api/v1/payments/checkout`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer dev-token" },
        body: JSON.stringify({ amount_cents: 10000, currency: "usd" }),
      }
    );
    const data = await response.json();
    if (!response.ok) {
      setStatus(`Payment failed: ${data.detail}`);
      return;
    }
    setPaymentId(data.payment_id);
    setStatus("Checkout session ready. Simulate payment in backend webhook.");
  }

  async function createAgreement() {
    const apiBase = resolveApiBase();
    if (!paymentId) {
      setStatus("Please create and complete payment first.");
      return;
    }
    setStatus("Creating agreement draft for both parties...");
  const response = await fetch(
      `${apiBase}/api/v1/agreements`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer dev-token" },
        body: JSON.stringify({
          payment_id: paymentId,
          agreement_type: "poker_staking",
          terms_version: "v1",
          terms: {
            stake_pct: Number(terms.stake_pct || 0),
            buy_in_amount: Number(terms.buy_in_amount || 0),
            bullet_cap: Number(terms.bullet_cap || 0),
            payout_basis: terms.payout_basis,
            event_date: terms.event_date,
            due_date: terms.due_date,
            party_a_label: terms.party_a_label,
            party_b_label: terms.party_b_label,
            notes: counterNotes || terms.notes,
            funds_received_at: terms.funds_received_at || null,
          },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      setStatus(`Agreement failed: ${data.detail}`);
      return;
    }
    setStatus(
      `Agreement ${data.id} created as draft. Share the verification link so both parties can confirm identical payout terms before locking the receipt.`
    );
    setTerms(initialTerms);
    setCounterNotes("");
    setNegotiationAction("idle");
  }

  const logFundsReceived = () => {
    setTerms((prev) => ({
      ...prev,
      funds_received_at: new Date().toISOString(),
    }));
    setStatus("Funds receipt timestamp logged for audit trail.");
  };

  return (
    <section className="bg-white shadow rounded-lg p-4 space-y-3">
      <header>
        <h2 className="text-xl font-semibold">Contract Builder</h2>
        <p className="text-sm text-gray-600">
          Mobile-first entry flow to capture the exact staking promise before anyone plays.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          name="party_a_label"
          placeholder="Your label (Backer name)"
          value={terms.party_a_label}
          onChange={handleTermsChange}
          className="border rounded px-3 py-2"
        />
        <input
          name="party_b_label"
          placeholder="Partner label (Player name)"
          value={terms.party_b_label}
          onChange={handleTermsChange}
          className="border rounded px-3 py-2"
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
          className="border rounded px-3 py-2"
        />
        <input
          name="buy_in_amount"
          type="number"
          min="0"
          placeholder="Buy-in amount per bullet (USD)"
          value={terms.buy_in_amount}
          onChange={handleTermsChange}
          className="border rounded px-3 py-2"
        />
        <input
          name="bullet_cap"
          type="number"
          min="1"
          placeholder="Bullet cap (e.g., 2)"
          value={terms.bullet_cap}
          onChange={handleTermsChange}
          className="border rounded px-3 py-2"
        />
        <select
          name="payout_basis"
          value={terms.payout_basis}
          onChange={handleTermsChange}
          className="border rounded px-3 py-2"
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
          className="border rounded px-3 py-2"
        />
        <input
          name="due_date"
          type="date"
          placeholder="Payout due date"
          value={terms.due_date}
          onChange={handleTermsChange}
          className="border rounded px-3 py-2"
        />
      </div>
      <textarea
        name="notes"
        placeholder="Extra clauses (e.g., markup adjustments, travel %, profit splits)"
        value={terms.notes}
        onChange={handleTermsChange}
        className="border rounded px-3 py-2 w-full min-h-[80px]"
      />
      <div className="bg-indigo-50 border border-indigo-100 rounded p-3 text-sm text-indigo-900">
        <p className="font-semibold mb-1">Promise Preview</p>
        <p>{summary}</p>
        <p className="mt-1 text-xs text-indigo-700">
          Share this draft link/QR with your partner. Both must acknowledge the same payout basis
          before ActionKeeper issues the tamper-evident receipt.
        </p>
      </div>
      <div className="bg-white border rounded p-3 space-y-2">
        <p className="text-sm font-semibold">Checklist before locking</p>
        <ul className="space-y-1">
          {checklist.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-sm">
              <span
                className={`h-4 w-4 rounded border flex items-center justify-center ${
                  item.checked ? "bg-green-500 border-green-500 text-white" : "border-gray-300"
                }`}
              >
                {item.checked ? "✓" : ""}
              </span>
              {item.label}
            </li>
          ))}
        </ul>
        <button
          onClick={logFundsReceived}
          className="px-3 py-1 text-xs border rounded text-indigo-700 border-indigo-200"
        >
          Log “Funds Received” Timestamp
        </button>
      </div>
      <div className="bg-gray-50 border rounded p-3 space-y-2">
        <p className="text-sm font-semibold">Swipe-style response</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setNegotiationAction("counter");
              setStatus("You swiped left. Add counter details and resend.");
            }}
            className="flex-1 px-3 py-2 border border-rose-300 text-rose-600 rounded"
          >
            ⬅ Swipe Left (Counter)
          </button>
          <button
            onClick={() => {
              setNegotiationAction("accepted");
              setStatus("You swiped right. Agreement ready for confirmation once partner agrees.");
            }}
            className="flex-1 px-3 py-2 border border-emerald-300 text-emerald-600 rounded"
          >
            Swipe Right (Accept)
          </button>
        </div>
        {negotiationAction === "counter" && (
          <div className="space-y-2">
            <textarea
              className="border rounded px-3 py-2 w-full text-sm"
              placeholder="Describe what needs to change (e.g., 10% net instead of gross, cap bullets at 1)."
              value={counterNotes}
              onChange={(e) => setCounterNotes(e.target.value)}
            />
            <p className="text-xs text-gray-600">
              This counter note will ride along with the draft so your partner sees why you swiped left.
            </p>
          </div>
        )}
        {negotiationAction === "accepted" && (
          <p className="text-xs text-gray-600">
            Once both of you swipe right, ActionKeeper flags the draft as ready and will embed the
            promise into the tamper-evident receipt.
          </p>
        )}
      </div>
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={createPayment}
          className="px-4 py-2 bg-indigo-600 text-white rounded"
        >
          1. Create Payment
        </button>
        <button
          onClick={createAgreement}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          2. Create Agreement
        </button>
      </div>
      {status && <p className="text-sm text-gray-700">{status}</p>}
    </section>
  );
}
