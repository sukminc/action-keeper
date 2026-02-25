import AgreementVault from "../sections/AgreementVault";
import VerificationCTA from "../sections/VerificationCTA";
import "../styles.css";

export const metadata = {
  title: "ActionKeeper · Buyer",
};

export default function BuyerPage() {
  return (
    <main>
      <header className="hero" style={{ marginBottom: "1.5rem" }}>
        <span className="hero-badge">Buyer · Player mode</span>
        <h1 className="hero-title">Review, counter, and confirm payouts.</h1>
        <p className="hero-subtitle">
          Scroll through pending drafts, verify payout basis, and open tamper-evident receipts once both sides
          lock the terms.
        </p>
      </header>
      <section className="sections-stack">
        <AgreementVault />
        <VerificationCTA />
      </section>
    </main>
  );
}
