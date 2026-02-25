import Link from "next/link";
import "./styles.css";

export default function Home() {
  return (
    <main>
      <header className="hero">
        <span className="hero-badge">ActionKeeper · Mobile staking</span>
        <h1 className="hero-title">Capture the promise before cards hit the felt.</h1>
        <p className="hero-subtitle">
          Pick your side—seller or buyer—and lock down the staking contract with tamper-evident QR receipts.
        </p>
        <div className="pill-row">
          <span className="pill">10% stake = $250 exposure</span>
          <span className="pill">Dual confirmation</span>
          <span className="pill">Negotiation history</span>
        </div>
      </header>

      <section className="cta-grid">
        <div className="cta-card">
          <h3>Seller / Player Hub</h3>
          <p>Players define how much action they are selling, log bullets, and share QR-ready drafts with backers.</p>
          <Link href="/seller" className="btn btn-primary" style={{ textAlign: "center" }}>
            Go to Seller Page
          </Link>
        </div>
        <div className="cta-card">
          <h3>Buyer / Backer Hub</h3>
          <p>Backers review offers, request adjustments, and pull receipts once the player confirms.</p>
          <Link href="/buyer" className="btn btn-secondary" style={{ textAlign: "center" }}>
            Go to Buyer Page
          </Link>
        </div>
      </section>
    </main>
  );
}
