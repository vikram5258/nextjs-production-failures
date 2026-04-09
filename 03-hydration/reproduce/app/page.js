// Reproduces 3 hydration mismatch patterns.
// Run `next build && next start` to see the errors — they're suppressed in dev.

// ❌ Pattern 1: Date rendered in local timezone (server UTC vs client local)
function BadDate({ timestamp }) {
  return <time>{new Date(timestamp).toLocaleDateString()}</time>
}

// ❌ Pattern 2: typeof window check — server renders null, client renders content
function BadClientCheck() {
  if (typeof window === 'undefined') return null
  return <div>Only on client</div>
}

// ❌ Pattern 3: Random ID generated at render time
function BadRandomId() {
  const id = Math.random().toString(36).slice(2)
  return <input id={id} />
}

export default function Page() {
  const timestamp = '2024-01-15T12:00:00Z'

  return (
    <main>
      <h2>Pattern 1: Date mismatch</h2>
      <BadDate timestamp={timestamp} />

      <h2>Pattern 2: window check</h2>
      <BadClientCheck />

      <h2>Pattern 3: Random ID</h2>
      <BadRandomId />
    </main>
  )
}
