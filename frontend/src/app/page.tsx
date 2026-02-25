import ContractBuilder from "./sections/ContractBuilder";
import AgreementVault from "./sections/AgreementVault";
import TripPlannerWidget from "./sections/TripPlannerWidget";
import VerificationCTA from "./sections/VerificationCTA";
import "./styles.css";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 p-4 space-y-8">
      <header className="text-center space-y-2">
        <p className="text-sm uppercase tracking-wide text-gray-500">
          ActionKeeper
        </p>
        <h1 className="text-3xl font-bold">Poker Staking Agreements on Phone</h1>
        <p className="text-gray-600">
          Build, pay, verify, and download receipts with tamper-evident hashes.
        </p>
      </header>
      <ContractBuilder />
      <AgreementVault />
      <TripPlannerWidget />
      <VerificationCTA />
    </main>
  );
}
