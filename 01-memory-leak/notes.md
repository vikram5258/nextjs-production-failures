# 01 — Memory Leaks That Kill Your Container

## The Symptom

The app runs fine locally. Works in staging. Then in production — usually after a few hours of traffic — the container crashes with OOM (Out of Memory). Kubernetes restarts it. Cycle repeats.

I first hit this on a project where we were using `next/og` for dynamic OG image generation. Every request to the `/api/og` route was leaking memory. Slowly at first, then fast enough to crash the pod every 3-4 hours.

## Root Causes I've Found

### 1. `next/og` in standalone builds

`next/og` uses `@vercel/og` under the hood which relies on Satori + a WASM-based font renderer. In standalone output mode, the WASM instance isn't properly cleaned up between requests.

Tracked issue: https://github.com/vercel/next.js/issues/65451

**Reproduce:** See `reproduce/` — a standalone Next.js app with an `/api/og` route under load. Hit `/api/memory` to watch heap grow in real time.

**Fix:** See `fixed/` — cache the font buffer at module level so it's only loaded once. But there's a subtle gotcha: caching the *resolved value* still has a race condition under concurrent load — multiple requests see `null` before the first read completes and each triggers its own file read. Cache the *Promise* instead:

```js
// ❌ Race condition — concurrent requests all see null before first resolves
let fontData = null
async function getFont() {
  if (!fontData) fontData = await readFile(fontPath) // 20 concurrent reqs = 20 reads
  return fontData
}

// ✅ Promise caching — only one read ever starts
let fontPromise = null
function getFont() {
  if (!fontPromise) fontPromise = readFile(fontPath) // all concurrent reqs share one promise
  return fontPromise
}
```

Tested under load: the fixed version RSS plateaus at ~265MB after 70 requests (+7MB over the next 30). The buggy version kept climbing +51MB over the same window with no plateau.

### 2. Next.js global `fetch()` patch

Next.js patches the global `fetch` to add caching. In some versions, this patch leaks memory when the same URL is fetched repeatedly with different headers (e.g. auth tokens).

Tracked issue: https://github.com/vercel/next.js/issues/64212

**Reproduce:** Repeated fetch calls with unique Authorization headers in a server component.

**Fix:** Use `cache: 'no-store'` explicitly, or use `import { fetch } from 'undici'` to bypass the Next.js patch for those calls.

### 3. `revalidatePath` + Server Actions loop

Using `revalidatePath` inside a server action that's called frequently causes the Full Route Cache to rebuild repeatedly, holding references in memory.

Tracked issue: https://github.com/vercel/next.js/issues/79588

**Fix:** Be surgical — use `revalidateTag` with specific tags instead of broad path revalidation.

## How to Diagnose

```bash
# Take a heap snapshot while the app is running
node --inspect dist/server.js

# Then in Chrome DevTools → Memory → Heap Snapshot
# Look for growing Detached DOM trees or large ArrayBuffers
```

See `scripts/heap-snapshot.js` in the root for a programmatic approach.

## What I Wish Someone Had Told Me

- Memory leaks in Next.js are almost never in your code — they're in the framework layer
- `output: 'standalone'` changes how modules are loaded and can expose leaks that don't appear in standard mode
- Always set memory limits on your containers (`--memory=512m`) so crashes are fast and observable rather than slow and degraded
- Add `/api/health` that reports `process.memoryUsage()` — makes leaks visible in your monitoring before they crash things
