"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type Agreement = {
  id: string;
  status: string;
  negotiation_state: string;
  last_proposed_by?: string;
  party_a_label?: string;
  party_b_label?: string;
  terms?: {
    stake_pct?: number;
    markup?: number;
    payout_basis?: string;
    buy_in_amount?: number;
    bullet_cap?: number;
  };
  pending_terms?: {
    stake_pct?: number;
    markup?: number;
    payout_basis?: string;
    bullet_cap?: number;
  };
};

type EventItem = {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export default function ContractRoom({ agreementId }: { agreementId: string }) {
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'info' | 'error', text: string } | null>(null);
  const [selectedActor, setSelectedActor] = useState<string>("");
  const [isCounterEditing, setIsCounterEditing] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);

  // Independent Draft State for editing
  const [draft, setDraft] = useState<{
    stake_pct: string;
    markup: string;
    payout_basis: string;
    first_bullet_only: boolean;
  } | null>(null);

  const resolveApiBase = () => "";

  const load = async () => {
    try {
      const res = await fetch(`${resolveApiBase()}/api/v1/agreements/${agreementId}`, {
        headers: { Authorization: "Bearer dev-token" },
      });
      if (res.ok) {
        const data = await res.json();
        setAgreement(data);
        if (!selectedActor) setSelectedActor(data.party_b_label || data.party_a_label || "");
      }
    } catch (e) { } finally { setLoading(false); }
  };

  const startCounter = () => {
    if (!agreement) return;
    const base = agreement.negotiation_state === 'countered' && agreement.pending_terms 
      ? agreement.pending_terms 
      : agreement.terms;
    
    setDraft({
      stake_pct: String(base?.stake_pct ?? "10"),
      markup: String(base?.markup ?? "1.0"),
      payout_basis: base?.payout_basis ?? "gross_payout",
      first_bullet_only: (base?.bullet_cap ?? 1) === 1
    });
    setIsCounterEditing(true);
  };

  const updateDraft = (key: string, value: any) => {
    if (!draft) return;
    const newDraft = { ...draft, [key]: value };
    if (key === 'first_bullet_only') {
      newDraft.payout_basis = value ? "gross_payout" : "diluted_total";
    }
    setDraft(newDraft);
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
      <div className="exposure-box" style={{ background: 'rgba(255,255,255,0.02)', borderStyle: 'solid' }}>
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

  const loadEvts = async () => {
    try {
      const res = await fetch(`${resolveApiBase()}/api/v1/agreements/${agreementId}/events`, {
        headers: { Authorization: "Bearer dev-token" },
      });
      if (res.ok) setEvents(await res.json());
    } catch (e) { }
  };

  useEffect(() => {
    load(); loadEvts();
    const t = setInterval(() => { load(); loadEvts(); }, 5000);
    return () => clearInterval(t);
  }, [agreementId]);

  const handleAction = async (type: 'accept' | 'counter' | 'decline', body?: any) => {
    if (!selectedActor) return setStatusMsg({ type: 'error', text: "Acting party를 먼저 선택해 주세요." });
    
    const res = await fetch(`${resolveApiBase()}/api/v1/agreements/${agreementId}/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer dev-token" },
      body: JSON.stringify(body || (type === 'accept' ? { accepter_label: selectedActor } : { decliner_label: selectedActor, reason: "Declined" })),
    });

    if (res.ok) {
      setStatusMsg({ type: 'info', text: `${type.toUpperCase()} 성공.` });
      setIsCounterEditing(false);
      load(); loadEvts();
    } else {
      const err = await res.json();
      setStatusMsg({ type: 'error', text: err.detail || "오류가 발생했습니다." });
    }
  };

  const isLocked = agreement?.negotiation_state === "accepted" || agreement?.negotiation_state === "declined";
  const myTurn = !agreement?.last_proposed_by || agreement.last_proposed_by !== selectedActor;

  const displayTerms = useMemo(() => {
    if (!agreement) return null;
    return agreement.negotiation_state === 'countered' && agreement.pending_terms 
      ? agreement.pending_terms 
      : agreement.terms;
  }, [agreement]);

  const diffs = useMemo(() => {
    if (!agreement || !agreement.pending_terms || agreement.negotiation_state !== 'countered') return {};
    const d: Record<string, any> = {};
    const keys = ['stake_pct', 'markup', 'payout_basis', 'bullet_cap'];
    keys.forEach(k => {
      const oldVal = (agreement.terms as any)?.[k];
      const newVal = (agreement.pending_terms as any)?.[k];
      if (oldVal !== newVal) d[k] = oldVal;
    });
    return d;
  }, [agreement]);

  if (loading) return <main><p className="status-text">Synchronizing...</p></main>;
  if (!agreement || !displayTerms) return <main><p className="status-text">Agreement not found.</p></main>;

  return (
    <div className="sections-stack animate-in">
      {/* Status Hub */}
      <section className="card accent">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className={`badge badge-${agreement.negotiation_state}`}>{agreement.negotiation_state}</span>
            <h2 className="card-title" style={{ marginTop: '0.5rem' }}>Negotiation Room</h2>
          </div>
          <select className="form-field" style={{ width: 'auto', padding: '4px 12px' }} value={selectedActor} onChange={e => setSelectedActor(e.target.value)}>
            <option value={agreement.party_a_label}>{agreement.party_a_label}</option>
            <option value={agreement.party_b_label}>{agreement.party_b_label}</option>
          </select>
        </div>
        
        {agreement.negotiation_state === 'countered' && (
          <div style={{ marginTop: '1rem', padding: '8px 12px', background: 'var(--accent-glow)', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid var(--accent)' }}>
            <strong>{agreement.last_proposed_by}</strong> 님이 새로운 조건을 제안했습니다. 아래 내용을 검토해 주세요.
          </div>
        )}

        {statusMsg && (
          <div style={{ marginTop: '1rem', padding: '10px', borderRadius: '8px', background: statusMsg.type === 'error' ? 'var(--danger)' : 'var(--accent-glow)', fontSize: '0.85rem' }}>
            {statusMsg.text}
          </div>
        )}
      </section>

      {/* Summary Box */}
      <section className="card">
        <p className="card-subtitle">Proposed Agreement Terms</p>
        <div className="exposure-box" style={{ borderColor: Object.keys(diffs).length > 0 ? 'var(--accent)' : 'rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <p className="card-subtitle" style={{ fontSize: '0.65rem' }}>BUY-IN (LOCKED)</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>${displayTerms.buy_in_amount?.toLocaleString()}</p>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <p className="card-subtitle" style={{ fontSize: '0.65rem', margin: 0 }}>STAKE</p>
                {diffs.stake_pct !== undefined && <span className="badge" style={{ background: 'var(--accent)', color: 'white', zoom: 0.8 }}>MODIFIED</span>}
              </div>
              <p style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>
                {displayTerms.stake_pct}%
                {diffs.stake_pct !== undefined && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px' }}>was {diffs.stake_pct}%</span>}
              </p>
            </div>
          </div>
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.85rem' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                Backer Pays: ${((Number(displayTerms.buy_in_amount || 0) * Number(displayTerms.stake_pct || 0) * Number(displayTerms.markup || 1)) / 100).toLocaleString()}
              </span>
            </div>
            <div style={{ opacity: 0.8, display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span>{displayTerms.markup}x Markup {diffs.markup !== undefined && <strong style={{color:'var(--accent)'}}>(was {diffs.markup}x)</strong>}</span>
              <span>·</span>
              <span>
                {displayTerms.payout_basis === 'gross_payout' && "% of Total Payout"}
                {displayTerms.payout_basis === 'net_profit' && "% of Net Profit"}
                {displayTerms.payout_basis === 'diluted_total' && "Diluted (Fixed $)"}
                {diffs.payout_basis !== undefined && <strong style={{color:'var(--accent)'}}> (changed)</strong>}
              </span>
              <span>·</span>
              <span>
                {displayTerms.bullet_cap === 1 ? "Freeze-out" : `${displayTerms.bullet_cap} Bullets max`}
                {diffs.bullet_cap !== undefined && <strong style={{color:'var(--accent)'}}> (changed)</strong>}
              </span>
            </div>
          </div>
        </div>

        {!isLocked && (
          <ScenarioPreview 
            stake={Number(displayTerms.stake_pct || 0)} 
            buyIn={Number(displayTerms.buy_in_amount || 0)} 
            basis={displayTerms.payout_basis || 'gross_payout'}
            isDiluted={displayTerms.payout_basis === 'diluted_total'}
          />
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button className="btn btn-primary" onClick={() => handleAction('accept')} disabled={isLocked}>Accept Terms</button>
          <button 
            className="btn btn-outline" 
            onClick={() => setIsCounterEditing(!isCounterEditing)} 
            disabled={isLocked}
          >
            {isCounterEditing ? "Cancel" : "Counter Offer"}
          </button>
        </div>
        {!isLocked && (
          <button className="btn btn-ghost" style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--danger)' }} onClick={() => handleAction('decline')}>Decline Agreement</button>
        )}
      </section>

      {/* Counter Form */}
      {isCounterEditing && (
        <section className="card animate-in" style={{ borderColor: 'var(--warning)' }}>
          <header className="card-header"><h2 className="card-title">Propose Changes</h2></header>
          <div className="form-grid">
            <div style={{ gridColumn: 'span 2' }}>
              <label className="card-subtitle" style={{ fontSize: '0.6rem' }}>Tournament Buy-in ($)</label>
              <input 
                className="form-field" 
                type="number" 
                value={agreement.terms?.buy_in_amount || ""} 
                disabled 
                style={{ opacity: 0.6, cursor: 'not-allowed', background: 'var(--bg)' }}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label className="card-subtitle" style={{ fontSize: '0.6rem' }}>Stake %</label>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent)' }}>{cStake}%</span>
              </div>
              <input 
                type="range" min="1" max="100" step="1" 
                className="form-field" style={{ padding: 0, height: '8px', margin: '15px 0' }}
                value={cStake} onChange={e => setCStake(e.target.value)} 
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label className="card-subtitle" style={{ fontSize: '0.6rem' }}>Markup</label>
                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{cMarkup}x</span>
              </div>
              <input 
                type="range" min="0.5" max="2.0" step="0.05" 
                className="form-field" style={{ padding: 0, height: '8px', margin: '15px 0' }}
                value={cMarkup} onChange={e => setCMarkup(e.target.value)} 
              />
            </div>
            
            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input 
                type="checkbox" 
                id="bulletToggle" 
                checked={cFirstBulletOnly} 
                onChange={e => {
                  const checked = e.target.checked;
                  setCFirstBulletOnly(checked);
                  // If opting out of Freeze-out (meaning multi-bullet), force Diluted
                  // If opting into Freeze-out, force Standard
                  setCPayout(checked ? "gross_payout" : "diluted_total");
                }} 
              />
              <label htmlFor="bulletToggle" className="card-subtitle" style={{ margin: 0, cursor: 'pointer', textTransform: 'none' }}>
                First bullet only (Freeze-out)
              </label>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label className="card-subtitle" style={{ fontSize: '0.6rem' }}>Payout Basis</label>
              <select className="form-field" value={cPayout} onChange={e => setCPayout(e.target.value)}>
                <option value="gross_payout">Standard: % of Total Payout</option>
                <option value="net_profit">Standard: % of Net Profit</option>
                {!cFirstBulletOnly && <option value="diluted_total">Diluted: Fixed $ Investment</option>}
              </select>
            </div>
          </div>
          
          <ScenarioPreview 
            stake={Number(cStake)} 
            buyIn={Number(cBuyIn)} 
            basis={cPayout} 
            isDiluted={!cFirstBulletOnly && cPayout === 'diluted_total'}
          />

          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => handleAction('counter', { 
            proposer_label: selectedActor, 
            terms: { 
              ...agreement.terms, 
              buy_in_amount: Number(cBuyIn),
              stake_pct: Number(cStake), 
              markup: Number(cMarkup), 
              payout_basis: cPayout,
              bullet_cap: cFirstBulletOnly ? 1 : (agreement.terms?.bullet_cap || 2)
            } 
          })}>
            Send Counter Update
          </button>
        </section>
      )}

      {/* Activity Timeline */}
      <section className="card">
        <header className="card-header"><h2 className="card-title">Activity Feed</h2></header>
        <div className="timeline">
          {events.length === 0 && <p className="status-text">No activity yet.</p>}
          {events.slice().reverse().map(evt => {
            const payload = evt.payload || {};
            let message: ReactNode = evt.event_type;
            
            if (evt.event_type === "negotiation_countered") {
              const changes = (payload.term_changes as Record<string, { from: any; to: any }>) || {};
              const changeList = Object.entries(changes).map(([key, val]) => {
                const label = key.replace('stake_pct', 'Stake').replace('markup', 'Markup').replace('payout_basis', 'Basis').replace('bullet_cap', 'Bullets');
                let from = String(val.from ?? '-');
                let to = String(val.to ?? '-');
                if (key === 'bullet_cap') {
                  from = from === '1' ? '1 (Freeze)' : from;
                  to = to === '1' ? '1 (Freeze)' : to;
                }
                return (
                  <div key={key} style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    • {label}: <span style={{ textDecoration: 'line-through' }}>{from}</span> → <strong style={{ color: 'var(--accent)' }}>{to}</strong>
                  </div>
                );
              });

              message = (
                <div>
                  <span><strong>{String(payload.proposer)}</strong> sent a counter-offer</span>
                  <div style={{ marginTop: '0.4rem', paddingLeft: '0.5rem', borderLeft: '1px solid var(--secondary)' }}>
                    {changeList}
                  </div>
                </div>
              );
            } else if (evt.event_type === "agreement_accepted") {
              message = <span><strong>{String(payload.accepter)}</strong> accepted the terms</span>;
            } else if (evt.event_type === "agreement_declined") {
              message = <span><strong>{String(payload.decliner)}</strong> declined the contract</span>;
            } else if (evt.event_type === "agreement_created") {
              message = "Draft agreement created";
            }

            return (
              <div key={evt.id} className="timeline-item">
                <div className="timeline-dot" />
                <div style={{ fontSize: '0.85rem' }}>{message}</div>
                <div className="card-subtitle" style={{ fontSize: '0.7rem', marginTop: '4px' }}>
                  {new Date(evt.created_at).toLocaleTimeString()}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
