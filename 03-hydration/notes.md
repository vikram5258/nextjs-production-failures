# 03 — Hydration Errors That Only Appear in Production

## The Symptom

```
Error: Hydration failed because the initial UI does not match what was rendered on the server.
```

Works perfectly in `next dev`. Crashes in production. Sometimes only for specific users.

## Root Cause 1: Date & Time Rendering

The server renders a timestamp in UTC. The client renders it in the user's local timezone. They don't match — hydration fails.

```jsx
// ❌ This breaks
export default function Post({ post }) {
  return <time>{new Date(post.createdAt).toLocaleDateString()}</time>
}
```

**Fix:** Either render dates on the client only using `useEffect`, or use a consistent format:

```jsx
// ✅ Consistent across server and client
export default function Post({ post }) {
  return (
    <time dateTime={post.createdAt}>
      {new Date(post.createdAt).toISOString().split('T')[0]}
    </time>
  )
}
```

## Root Cause 2: Browser Extensions Mutating the DOM

Password managers, ad blockers, and translation extensions modify the DOM after the server renders it. React then compares its virtual DOM to the modified real DOM — mismatch.

**Fix:** This one you can't fully prevent. Suppress it on the affected elements:

```jsx
<div suppressHydrationWarning>
  {content}
</div>
```

Only use this on elements where you know external mutation is expected.

## Root Cause 3: `typeof window` Checks

```jsx
// ❌ Server: window is undefined → renders null
// ❌ Client: window exists → renders the component
// = hydration mismatch
export default function Component() {
  if (typeof window === 'undefined') return null
  return <SomeClientOnlyThing />
}
```

**Fix:** Use `useEffect` to defer client-only rendering:

```jsx
// ✅
'use client'
import { useState, useEffect } from 'react'

export default function Component() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return <SomeClientOnlyThing />
}
```

## Root Cause 4: Random IDs / Math.random()

Generating IDs or random values during render:

```jsx
// ❌ Different value on server vs client
const id = Math.random().toString(36).slice(2)
```

**Fix:** Use React's `useId()` hook — it generates stable IDs that match between server and client.

## What I Wish Someone Had Told Me

- In development, React recovers from hydration mismatches silently. In production (`NODE_ENV=production`), it throws. This is why you only see it in prod.
- The error message rarely tells you which element caused the mismatch. Add `data-testid` attributes liberally during debugging.
- `suppressHydrationWarning` is a band-aid — understand why the mismatch is happening before reaching for it.
