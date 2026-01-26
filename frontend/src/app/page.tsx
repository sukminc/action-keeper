export default function Home() {
  return (
    <main>
      <h1>ActionKeeper</h1>
      <p>Mobile-first poker staking agreements.</p>
      <p>API: {process.env.NEXT_PUBLIC_API_URL}</p>
    </main>
  );
}