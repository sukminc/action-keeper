import ContractBuilder from "../sections/ContractBuilder";

export const metadata = {
  title: "ActionKeeper · Seller",
};

export default function SellerPage() {
  return (
    <main>
      <header className="hero" style={{ marginBottom: "1.5rem" }}>
        <span className="hero-badge">Seller · Player mode</span>
        <h1 className="hero-title">Offer your action · no surprise edits.</h1>
        <p className="hero-subtitle">
          Capture stake %, buy-ins, and payout basis. Share the draft so your backer can
          review from the buyer page.
        </p>
      </header>
      <section className="sections-stack">
        <ContractBuilder />
      </section>
    </main>
  );
}
