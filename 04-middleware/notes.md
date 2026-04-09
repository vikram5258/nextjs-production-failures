# 04 — Middleware Gotchas That Silently Fail

## The Symptom

Middleware works in dev, silently does nothing in production standalone builds. No error. No log. Just... ignored.

## Root Cause 1: Assets Not Bundled in Standalone Mode

If your middleware reads from the filesystem (config files, JSON, etc.), those files aren't included in the standalone output by default.

```js
// middleware.js
// ❌ This file won't exist in standalone build
import blocklist from './data/blocklist.json'
```

**Fix:** Tell Next.js to include those files:

```js
// next.config.js
module.exports = {
  output: 'standalone',
  outputFileTracingIncludes: {
    '/': ['./data/**/*'],
  },
}
```

## Root Cause 2: Edge Runtime Limitations

Middleware runs on the Edge Runtime by default, which is a restricted subset of Node.js. These APIs are **not available**:

- `fs` (no filesystem access)
- `child_process`
- Most native Node modules
- `Buffer` (partially available)

If your middleware uses any of these, it fails silently in some environments.

**Fix (Next.js 15+):** Switch to Node.js runtime for middleware:

```js
// middleware.js
export const runtime = 'nodejs'
```

Or in Next.js 16, use `proxy.ts` instead:

```js
// proxy.ts (Next.js 16) — runs on Node.js runtime
export function proxy(request) {
  // full Node.js APIs available here
}
```

## Root Cause 3: Matcher Misconfiguration

A common mistake — forgetting to exclude static assets from middleware:

```js
// ❌ Runs middleware on every /_next/static/* request
export const config = {
  matcher: '/:path*',
}

// ✅ Exclude static files and API health checks
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/health).*)',
  ],
}
```

Running middleware on static assets adds latency and can cause issues with signed URLs.

## Root Cause 4: Middleware Auth Token Verification

JWT verification in middleware requires the Edge-compatible `jose` library, not `jsonwebtoken`:

```js
// ❌ jsonwebtoken uses Node.js crypto APIs — won't work on Edge
import jwt from 'jsonwebtoken'

// ✅ jose is Edge-compatible
import { jwtVerify } from 'jose'

export async function middleware(request) {
  const token = request.cookies.get('token')?.value
  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET))
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
```

## What I Wish Someone Had Told Me

- Always test middleware with `next build && next start`, not just `next dev` — the Edge runtime differences only show up in the production build
- Log at the start of your middleware function. If the log doesn't appear, the middleware isn't running at all
- The `matcher` config silently fails if the regex is invalid — Next.js doesn't throw, it just skips the middleware
