"use client";

import { useState } from "react";

export default function TripPlannerWidget() {
  const [form, setForm] = useState({
    destination: "",
    days: 4,
    bankroll: 4000,
  });
  const [plan, setPlan] = useState<any>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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

async function planTrip() {
  const apiBase = resolveApiBase();
  if (!apiBase) return;
  const response = await fetch(
      `${apiBase}/api/v1/trip-planner/plan`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer dev-token" },
        body: JSON.stringify({
          destination: form.destination,
          days: Number(form.days),
          bankroll: Number(form.bankroll),
        }),
      }
    );
    setPlan(await response.json());
  }

  return (
    <section className="bg-white shadow rounded-lg p-4 space-y-3">
      <header>
        <h2 className="text-xl font-semibold">Trip Planner</h2>
        <p className="text-sm text-gray-600">
          Budget travel modules for tournament trips plus affiliate hooks.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          name="destination"
          placeholder="Destination"
          value={form.destination}
          onChange={handleChange}
          className="border rounded px-3 py-2"
        />
        <input
          name="days"
          type="number"
          min={1}
          max={30}
          value={form.days}
          onChange={handleChange}
          className="border rounded px-3 py-2"
        />
        <input
          name="bankroll"
          type="number"
          value={form.bankroll}
          onChange={handleChange}
          className="border rounded px-3 py-2"
        />
      </div>
      <button
        onClick={planTrip}
        className="px-4 py-2 bg-orange-500 text-white rounded"
      >
        Generate Plan
      </button>
      {plan && (
        <div className="border rounded p-3 text-sm text-gray-700 space-y-2">
          <p>
            Budget: ${plan.total_budget} for {plan.days} days ({plan.daily_budget}/day)
          </p>
          <ul className="list-disc pl-5">
            {plan.affiliate_offers.map((offer: any) => (
              <li key={offer.partner}>
                {offer.partner}: {offer.discount_code}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
