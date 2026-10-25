export default function Loading() {
  return (
    <main className="standalone" aria-busy="true">
      <div className="skeleton" />
      <p>Loading your workspace…</p>
    </main>
  );
}
