export default function VerificationCTA() {
  return (
    <section className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
      <h2 className="text-xl font-semibold">QR Verification</h2>
      <p className="text-sm text-gray-600">
        Every agreement ships with a tamper-evident hash and verification URL.
        Scan QR codes in receipts or hit the API directly:
      </p>
      <ul className="list-disc pl-5 text-sm text-indigo-900 mt-2">
        <li>GET /api/v1/verify?id=AGREEMENT_ID&hash=HASH</li>
        <li>GET /api/v1/agreements/{`{id}`}/artifact for the PDF.</li>
        <li>Integrate your own scanner by using qr_payload.verification_url.</li>
      </ul>
    </section>
  );
}
