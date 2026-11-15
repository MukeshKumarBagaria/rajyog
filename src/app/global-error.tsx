'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#fff9f6', color: '#46333b', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 20 }}>Rajyog hit an unexpected error</h1>
          <p style={{ color: '#866b75' }}>Your data is safe. Please try again.</p>
          <button onClick={reset} style={{ background: '#b05676', color: '#fff', border: 0, borderRadius: 12, padding: '10px 20px', fontWeight: 600 }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
