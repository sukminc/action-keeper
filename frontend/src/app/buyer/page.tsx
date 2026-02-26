import AgreementVault from "../sections/AgreementVault";

export const metadata = {
  title: "ActionKeeper · Buyer",
};

export default function BuyerPage() {
  return (
    <main>
      <header className="hero" style={{ marginBottom: "1.5rem" }}>
        <span className="hero-badge">Buyer · Monitor mode</span>
        <h1 className="hero-title">Track contracts before receipt lock.</h1>
        <p className="hero-subtitle">
          This page is an admin-style monitor. Open each shared contract room to negotiate terms turn-by-turn.
        </p>
      </header>
      <section className="sections-stack">
        <AgreementVault />
      </section>
    </main>
  );
}
