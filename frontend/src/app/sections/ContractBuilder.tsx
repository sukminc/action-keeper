"use client";

import { useMemo, useState } from "react";

const initialTerms = {
  stake_pct: "10",
  buy_in_amount: "",
  markup: "1.0",
  payout_basis: "gross_payout",
  party_a_label: "",
  party_b_label: "",
  first_bullet_only: true,
};

const ScenarioPreview = ({ stake, buyIn, basis, isDiluted }: { stake: number, buyIn: number, basis: string, isDiluted: boolean }) => {
  const calc = (payout: number, bullets: number) => {
    let effectiveStake = stake;
    if (isDiluted && bullets > 1) effectiveStake = stake / bullets;
    const totalCost = buyIn * bullets;
    if (basis === 'net_profit') {
      const profit = Math.max(0, payout - totalCost);
      return (profit * effectiveStake) / 100;
    }
    return (payout * effectiveStake) / 100;
  };

  const scenarios = [
    { label: 'Min Cash (2x)', payout: buyIn * 2 },
    { label: 'Deep Run (10x)', payout: buyIn * 10 },
    { label: 'Victory (50x)', payout: buyIn * 50 },
  ];

  return (
    <div className="exposure-box" style={{ background: 'rgba(255,255,255,0.02)', borderStyle: 'solid', marginTop: '1rem' }}>
      <p className="card-subtitle" style={{ marginBottom: '0.75rem', color: 'var(--accent)' }}>Payout Scenarios (Backer's Share)</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {scenarios.map(s => (
          <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span>{s.label}</span>
            <span style={{ fontWeight: 700 }}>
              {isDiluted ? (
                `1st: $${calc(s.payout, 1).toLocaleString()} / 2nd: $${calc(s.payout, 2).toLocaleString()}`
              ) : (
                `$${calc(s.payout, 1).toLocaleString()}`
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function ContractBuilder() {
  const [terms, setTerms] = useState(initialTerms);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const handleTermsChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    if (name === "first_bullet_only") {
      setTerms({ 
        ...terms, 
        [name]: checked, 
        payout_basis: checked ? "gross_payout" : "diluted_total" 
      });
    } else {
      setTerms({ ...terms, [name]: type === 'checkbox' ? checked : value });
    }
  };

  const buyInNum = Number(terms.buy_in_amount || 0);
  const stakeNum = Number(terms.stake_pct || 0);
  const markupNum = Number(terms.markup || 1.0);

  const backerPays = (buyInNum * stakeNum * markupNum) / 100;

  const resolveApiBase = () => "";

  async function sendOffer() {
    if (!terms.party_a_label || !terms.party_b_label || buyInNum <= 0) {
      setStatus("Please fill in names and buy-in amount.");
      return;
    }
    setIsSubmitting(true);
    setStatus("Creating contract...");
    try {
      const res = await fetch(`${resolveApiBase()}/api/v1/agreements`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer dev-token" },
        body: JSON.stringify({
          payment_id: "offer-intent",
          agreement_type: "poker_staking",
          terms_version: "v2-pro",
          proposer_label: terms.party_a_label,
          terms: {
            ...terms,
            bullet_cap: terms.first_bullet_only ? 1 : 2,
            buy_in_amount: buyInNum,
            stake_pct: stakeNum,
            markup: markupNum,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Creation failed");
      setCreatedId(data.id);
      setStatus("Contract created successfully!");
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="sections-stack animate-in">
      <section className="card accent">
        <header className="card-header">
          <h2 className="card-title">Create Staking Offer</h2>
          <p className="card-subtitle">Enter tournament details to start negotiation.</p>
        </header>

        <div className="form-grid">
          <div style={{ gridColumn: 'span 2' }}>
            <label className="card-subtitle" style={{ fontSize: '0.6rem' }}>Acting As (Player Name)</label>
            <input name="party_a_label" className="form-field" placeholder="e.g. yoon" value={terms.party_a_label} onChange={handleTermsChange} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label className="card-subtitle" style={{ fontSize: '0.6rem' }}>Backer Name</label>
            <input name="party_b_label" className="form-field" placeholder="e.g. kim" value={terms.party_b_label} onChange={handleTermsChange} />
          </div>
          
          <div style={{ gridColumn: 'span 2' }}>
            <label className="card-subtitle" style={{ fontSize: '0.6rem' }}>Tournament Buy-in ($)</label>
            <input name="buy_in_amount" type="number" className="form-field" placeholder="e.g. 1000" value={terms.buy_in_amount} onChange={handleTermsChange} />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label className="card-subtitle" style={{ fontSize: '0.6rem' }}>Stake %</label>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent)' }}>{terms.stake_pct}%</span>
            </div>
            <input 
              name="stake_pct" type="range" min="1" max="100" step="1" 
              className="form-field" style={{ padding: 0, height: '8px', margin: '15px 0' }}
              value={terms.stake_pct} onChange={handleTermsChange} 
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label className="card-subtitle" style={{ fontSize: '0.6rem' }}>Markup</label>
              <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{terms.markup}x</span>
            </div>
            <input 
              name="markup" type="range" min="0.5" max="2.0" step="0.05" 
              className="form-field" style={{ padding: 0, height: '8px', margin: '15px 0' }}
              value={terms.markup} onChange={handleTermsChange} 
            />
          </div>

          <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input name="first_bullet_only" type="checkbox" id="fb" checked={terms.first_bullet_only} onChange={handleTermsChange} />
            <label htmlFor="fb" className="card-subtitle" style={{ margin: 0, cursor: 'pointer', textTransform: 'none' }}>First bullet only (Freeze-out)</label>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label className="card-subtitle" style={{ fontSize: '0.6rem' }}>Payout Basis</label>
            <select name="payout_basis" className="form-field" value={terms.payout_basis} onChange={handleTermsChange}>
              <option value="gross_payout">Standard: % of Total Payout</option>
              <option value="net_profit">Standard: % of Net Profit</option>
              {!terms.first_bullet_only && <option value="diluted_total">Diluted: Fixed $ Investment</option>}
            </select>
          </div>
        </div>
      </section>

      <section className="card">
        <p className="card-subtitle">Offer Summary</p>
        <div className="exposure-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Backer Investment:</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>${backerPays.toLocaleString()}</span>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.6 }}>
            {terms.stake_pct}% of ${Number(terms.buy_in_amount || 0).toLocaleString()} @ {terms.markup}x
          </div>
        </div>

        <ScenarioPreview 
          stake={stakeNum} 
          buyIn={buyInNum} 
          basis={terms.payout_basis} 
          isDiluted={!terms.first_bullet_only && terms.payout_basis === 'diluted_total'} 
        />

        <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={sendOffer} disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Create & Share Contract"}
        </button>
        {status && <p className="status-text" style={{ textAlign: 'center', marginTop: '1rem' }}>{status}</p>}
      </section>

      {createdId && (
        <section className="card animate-in" style={{ borderColor: 'var(--accent)' }}>
          <p className="card-title">Contract Ready!</p>
          <p className="status-text">Share this link with your backer:</p>
          <div className="form-field" style={{ background: 'var(--bg)', borderStyle: 'dashed', textAlign: 'center' }}>
            <a href={`/contract/${createdId}`} style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>
              Open Shared Room →
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
