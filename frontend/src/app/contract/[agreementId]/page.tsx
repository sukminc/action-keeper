import ContractRoom from "../../sections/ContractRoom";

type ContractPageProps = {
  params: {
    agreementId: string;
  };
};

export default function ContractPage({ params }: ContractPageProps) {
  return (
    <main>
      <header className="hero" style={{ marginBottom: "1.2rem" }}>
        <span className="hero-badge">Shared Contract</span>
        <h1 className="hero-title">Same link, same status, same terms.</h1>
        <p className="hero-subtitle">
          Both parties can open this page and complete Accept/Counter/Decline in real time.
        </p>
      </header>
      <ContractRoom agreementId={params.agreementId} />
    </main>
  );
}
