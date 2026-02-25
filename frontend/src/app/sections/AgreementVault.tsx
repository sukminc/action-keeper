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

const resolveApiBase = () => {
  if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.length > 0) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
};

async function load() {
  const apiBase = resolveApiBase();
  if (!apiBase) return;
  const response = await fetch(
      `${apiBase}/api/v1/agreements`,
      {
        headers: { Authorization: "Bearer dev-token" },
      }
    );
    if (response.ok) {
      setAgreements(await response.json());
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="bg-white shadow rounded-lg p-4 space-y-3">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Agreement Vault</h2>
          <p className="text-sm text-gray-600">
            Track receipts, download PDFs, and open QR verification links.
          </p>
        </div>
        <button
          onClick={load}
          className="px-3 py-1 border rounded text-gray-700"
        >
          Refresh
        </button>
      </header>
      <div className="space-y-2">
        {agreements.map((agreement) => (
          <div
            key={agreement.id}
            className="border rounded p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="font-semibold">#{agreement.id}</p>
              <p className="text-sm text-gray-500">Status: {agreement.status}</p>
              {agreement.terms && (
                <p className="text-xs text-gray-600 mt-1">
                  {agreement.terms.stake_pct ?? "–"}% |
                  {agreement.terms.payout_basis ?? "basis TBD"} | Buy-in $
                  {agreement.terms.buy_in_amount ?? "–"} | Bullets{" "}
                  {agreement.terms.bullet_cap ?? "–"} | Event{" "}
                  {agreement.terms.event_date ?? "TBD"}
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {agreement.qr_payload && (
                <a
                  href={agreement.qr_payload.verification_url}
                  className="text-indigo-600 underline text-sm"
                >
                  Open Verify Link
                </a>
              )}
              {agreement.artifact && (
                <a
                  href={agreement.artifact.verification_url}
                  className="text-indigo-600 underline text-sm"
                >
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
