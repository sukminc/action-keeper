export default function VerificationCTA() {
  return (
    <section className="card secondary">
      <h2 className="card-title">QR Verification</h2>
      <p className="card-subtitle">
        Every agreement ships with a tamper-evident hash and verification URL. Use these endpoints to
        double-check the promise anytime.
      </p>
      <ul className="list-muted">
        <li>GET /api/v1/verify?id=AGREEMENT_ID&hash=HASH</li>
        <li>GET /api/v1/agreements/{`{id}`}/artifact for the PDF.</li>
        <li>Use `qr_payload.verification_url` inside your scanner or wallet.</li>
      </ul>
    </section>
  );
}
