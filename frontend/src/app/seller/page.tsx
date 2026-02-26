import ContractBuilder from "../sections/ContractBuilder";

export const metadata = {
  title: "ActionKeeper · Seller",
};

export default function SellerPage() {
  return (
    <main>
      <header className="hero" style={{ marginBottom: "1.5rem" }}>
        <span className="hero-badge">Seller · Player mode</span>
        <h1 className="hero-title">Create your poker staking offer.</h1>
        <p className="hero-subtitle">
          Set your terms once, send one shared contract link, and negotiate live with your backer.
        </p>
      </header>
      <section className="sections-stack">
        <ContractBuilder />
      </section>
    </main>
  );
}
