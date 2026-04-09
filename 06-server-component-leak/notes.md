# 06 — Server Component Data Leaking Across Requests

## The Symptom

User A logs in and sees User B's data. Or cached server component output contains PII that doesn't belong to the current user. Sometimes intermittent — makes it worse to debug.

This is the scariest failure mode on this list because you can ship it without knowing, and you won't see it in tests.

## Root Cause 1: Module-Level Caching Across Requests

Server Components run on the server, but if you cache data in module scope, that cache is shared across all requests.

```js
// ❌ This data is shared across ALL users
let cachedUser = null

async function getUser(id) {
  if (!cachedUser) {
    cachedUser = await db.user.findUnique({ where: { id } })
  }
  return cachedUser
}
```

The first user to hit the server populates `cachedUser`. Every subsequent user gets that same user object — regardless of their own session.

**Fix:** Never cache user-specific data in module scope. Use React's `cache()` for per-request memoization:

```js
// ✅ cache() is scoped per request, not per server instance
import { cache } from 'react'

const getUser = cache(async (id) => {
  return await db.user.findUnique({ where: { id } })
})
```

`cache()` deduplicates calls within a single render pass, but the cache is thrown away at the end of each request.

## Root Cause 2: Shared Mutable State in Singleton Services

A common pattern in non-Next.js backends — a singleton service that holds state:

```js
// lib/auth.js
// ❌ This instance is shared across all server requests
class AuthService {
  constructor() {
    this.currentUser = null
  }

  setUser(user) {
    this.currentUser = user
  }

  getUser() {
    return this.currentUser
  }
}

export const auth = new AuthService()
```

In a Next.js Server Component:
```js
// ❌ Sets currentUser globally — bleeds into other requests
auth.setUser(await getSessionUser(request))
const user = auth.getUser()
```

**Fix:** Pass user context explicitly through function parameters, or use `headers()` / `cookies()` from `next/headers` which are request-scoped:

```js
// ✅ Each request reads its own headers/cookies
import { cookies } from 'next/headers'

async function getCurrentUser() {
  const cookieStore = cookies()
  const token = cookieStore.get('session-token')?.value
  if (!token) return null
  return await validateToken(token)
}
```

## Root Cause 3: fetch() Cache Serving Cross-User Data

Next.js extends `fetch()` with a built-in cache. If you fetch user-specific data without opting out of caching, that response can be served to other users.

```js
// ❌ Next.js caches this by URL — same URL for all users
const res = await fetch(`https://api.example.com/user/profile`, {
  headers: { Authorization: `Bearer ${token}` },
})
```

The cache key is the URL. Different users have different tokens but hit the same URL — first response gets cached and served to everyone.

**Fix:** Tag user-specific fetches with `cache: 'no-store'` or use `unstable_noStore()`:

```js
// ✅
import { unstable_noStore as noStore } from 'next/cache'

async function getUserProfile(token) {
  noStore() // opts this render out of static caching
  const res = await fetch(`https://api.example.com/user/profile`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  return res.json()
}
```

## Root Cause 4: generateStaticParams with User-Specific Pages

If you accidentally use `generateStaticParams` on a route that's supposed to be user-specific, Next.js pre-renders those pages at build time with whatever data is available — then serves the static version to everyone.

```js
// ❌ This statically generates /dashboard/[userId] at build time
export async function generateStaticParams() {
  const users = await db.user.findMany()
  return users.map(u => ({ userId: u.id }))
}
```

**Fix:** Don't use `generateStaticParams` on authenticated/user-specific routes. Use `dynamic = 'force-dynamic'` to make sure the route never gets statically cached:

```js
// ✅
export const dynamic = 'force-dynamic'

export default async function DashboardPage({ params }) {
  const user = await getCurrentUser()
  // ...
}
```

## How to Detect This

Add a response header that identifies which user's data was used to render the page. If you see a mismatch in your logs, you have a leak:

```js
// layout.js
import { headers } from 'next/headers'

export default async function RootLayout({ children }) {
  const user = await getCurrentUser()
  
  // visible in DevTools Network tab
  const headersList = headers()
  // Note: you can't set response headers directly in Server Components
  // Use middleware to add debug headers instead
  
  return <html>{children}</html>
}
```

Better: run a test where two concurrent sessions hit the same page and verify each gets its own data.

## What I Wish Someone Had Told Me

- Module-level variables in Next.js are **server-wide**, not request-scoped. Treat them like you would a static class variable in any other language.
- React's `cache()` is not the same as Next.js's data cache — it's specifically for deduplicating within a single request/render tree
- If you're migrating from Pages Router, watch out for patterns that worked there (like singleton service classes) that silently break in App Router due to the server component model
- Write a test that makes two authenticated requests back-to-back and asserts the user data doesn't bleed between them
