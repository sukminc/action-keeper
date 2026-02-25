"use client";

import { useState } from "react";

const initialTerms = {
  buy_in: "",
  markup: "",
  stake_pct: "",
};

export default function ContractBuilder() {
  const [paymentId, setPaymentId] = useState("");
  const [terms, setTerms] = useState(initialTerms);
  const [status, setStatus] = useState<string | null>(null);

  const handleTermsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTerms({ ...terms, [e.target.name]: e.target.value });
  };

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
    setStatus("Creating agreement...");
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
            buy_in: Number(terms.buy_in),
            markup: Number(terms.markup),
            stake_pct: Number(terms.stake_pct),
          },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      setStatus(`Agreement failed: ${data.detail}`);
      return;
    }
    setStatus(`Agreement ${data.id} created. Download receipt from vault.`);
    setTerms(initialTerms);
  }

  return (
    <section className="bg-white shadow rounded-lg p-4 space-y-3">
      <header>
        <h2 className="text-xl font-semibold">Contract Builder</h2>
        <p className="text-sm text-gray-600">
          Mobile-first entry flow to capture stakes and trigger payments.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {Object.keys(terms).map((key) => (
          <input
            key={key}
            name={key}
            placeholder={key.replace("_", " ")}
            value={(terms as any)[key]}
            onChange={handleTermsChange}
            className="border rounded px 3 py-2"
          />
        ))}
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
