# 01 — Memory Leaks That Kill Your Container

## The Symptom

The app runs fine locally. Works in staging. Then in production — usually after a few hours of traffic — the container crashes with OOM (Out of Memory). Kubernetes restarts it. Cycle repeats.

I first hit this pattern on a project where we had a product catalog loaded from a JSON file in an API route. It worked fine until Black Friday traffic hit. Heap swinging 200-500MB, containers restarting every 20 minutes.

## Root Cause: Reading Files Inside Request Handlers

The most common version of this I've seen — loading a data file (config, catalog, translations, feature flags) on every request:

```js
// ❌ This kills your server under load
export async function GET(request) {
  const raw = await readFile('./data/products.json', 'utf-8')
  const { products } = JSON.parse(raw)  // 4MB parsed object, every request
  return Response.json(products)
}
```

Under 30 concurrent requests, you have 30 separate 4MB parsed objects in memory simultaneously. Node.js GC tries to clean them up but new requests arrive faster than it can collect. Heap thrashes between 140MB and 520MB. Eventually it can't recover.

**Reproduce:** See `reproduce/` — hit `/api/products` under load and watch `/api/memory`.

**Fix:** See `fixed/` — cache the Promise at module level.

```js
// ✅ File read and parsed exactly once, shared across all requests
let productsPromise = null

function getProducts() {
  if (!productsPromise) {
    productsPromise = readFile('./data/products.json', 'utf-8')
      .then(raw => JSON.parse(raw).products)
  }
  return productsPromise
}
```

The key detail: cache the **Promise**, not the resolved value. Caching the value has a race condition — concurrent requests all see `null` before the first read resolves and each starts its own file read. Caching the Promise means all concurrent requests await the same operation.

## Load Test Results

Same endpoint, same concurrency (30 concurrent requests for 30 seconds):

| Metric | Buggy | Fixed |
|---|---|---|
| Heap under load | 139–521 MB (thrashing) | 108–197 MB (stable) |
| RSS peak | 727 MB | 424 MB |
| Requests served | 2,054 | 74,071 |
| Throughput | ~68 req/s | ~2,469 req/s |

36x more throughput. 300MB less peak RSS. The fix is one function.

## Other Patterns That Cause the Same Leak

### Next.js global `fetch()` patch

Next.js patches the global `fetch` to add caching. In some versions, this patch leaks memory when the same URL is fetched repeatedly with different headers (e.g. auth tokens).

Tracked issue: https://github.com/vercel/next.js/issues/64212

**Fix:** Use `cache: 'no-store'` explicitly, or use `import { fetch } from 'undici'` to bypass the Next.js patch for those calls.

### `revalidatePath` + Server Actions loop

Using `revalidatePath` inside a server action that's called frequently causes the Full Route Cache to rebuild repeatedly, holding references in memory.

**Fix:** Be surgical — use `revalidateTag` with specific tags instead of broad path revalidation.

## How to Diagnose

Add a `/api/memory` endpoint so you can watch memory in real time:

```js
export async function GET() {
  const mem = process.memoryUsage()
  return Response.json({
    rss: Math.round(mem.rss / 1024 / 1024) + ' MB',
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + ' MB',
    heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + ' MB',
    external: Math.round(mem.external / 1024 / 1024) + ' MB',
  })
}
```

See `scripts/heap-snapshot.js` in the root for taking V8 heap snapshots programmatically.

## What I Wish Someone Had Told Me

- If heap is oscillating wildly (not growing steadily), that's GC thrashing — it's already in trouble
- The leak usually isn't obvious in dev because local traffic is low and GC keeps up
- Always set memory limits on containers so crashes are fast and visible, not slow and degraded
- Module-level variables in Next.js persist for the lifetime of the server process — use that intentionally
