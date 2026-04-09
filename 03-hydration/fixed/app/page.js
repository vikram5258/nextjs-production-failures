'use client'
import { useState, useEffect, useId } from 'react'

// ✅ Pattern 1: ISO format — same on server and client
function GoodDate({ timestamp }) {
  return (
    <time dateTime={timestamp}>
      {new Date(timestamp).toISOString().split('T')[0]}
    </time>
  )
}

// ✅ Pattern 2: mounted guard via useEffect
function GoodClientCheck() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return <div>Only on client</div>
}

// ✅ Pattern 3: useId() generates stable IDs across server and client
function GoodId() {
  const id = useId()
  return <input id={id} />
}

export default function Page() {
  const timestamp = '2024-01-15T12:00:00Z'

  return (
    <main>
      <h2>Pattern 1: Date — consistent format</h2>
      <GoodDate timestamp={timestamp} />

      <h2>Pattern 2: Client-only component with mount guard</h2>
      <GoodClientCheck />

      <h2>Pattern 3: Stable ID via useId()</h2>
      <GoodId />
    </main>
  )
}
