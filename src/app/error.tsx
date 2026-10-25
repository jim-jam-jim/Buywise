'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="standalone">
      <h1>Something interrupted this page.</h1>
      <p>Your saved decisions are safe. Try loading the page again.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
