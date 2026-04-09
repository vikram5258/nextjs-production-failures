# 02 — ISR & Cache Invalidation That Lies to You

## The Symptom

You call `revalidatePath('/products')` after updating your database. The page still shows stale data. You check the database — it's updated. You check the route — it revalidates successfully. But the user is still seeing old content.

This one cost me an embarrassing amount of time on a project with a product catalogue that needed near-real-time updates.

## Root Cause 1: Multi-Instance Deployments

When you run multiple Next.js instances (horizontal scaling, Kubernetes pods, etc.), each instance has its own file-system cache.

`revalidatePath` / `revalidateTag` only invalidates the cache on **the instance that receives the API call**. Other pods keep serving stale data until their cache expires naturally.

**Reproduce:** See `reproduce/` — two Next.js instances behind a simple load balancer (nginx). Revalidate on one, observe stale response from the other.

**Fix:** Use a custom cache handler that stores cache in Redis (shared across all instances). See `fixed/cache-handler.js`.

## Root Cause 2: CDN Serving Stale Content

Even after the Next.js cache is invalidated, your CDN (Cloudflare, CloudFront, etc.) may still be serving the old page based on the `Cache-Control` header Next.js sends.

By default, ISR pages get:
```
Cache-Control: s-maxage=<revalidate>, stale-while-revalidate
```

This tells your CDN: "cache this for X seconds, and serve stale while revalidating in the background." The problem is the CDN doesn't know about your on-demand revalidation — it keeps serving its cached version until the CDN TTL expires.

**Fix:** Override the cache-control header in your route:

```js
// app/products/page.js
export async function generateMetadata() {
  return {
    other: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  }
}
```

Or more precisely — configure your CDN to honour `Surrogate-Control` and use `revalidateTag` with cache tag headers.

## Root Cause 3: The Router Cache (Client-Side)

Even after the server cache is invalidated, the browser's client-side Router Cache keeps pages for 30 seconds (static) or 5 minutes (dynamic) by default.

This means even after you call `revalidatePath`, users already on the site won't see the update until their router cache expires or they do a hard refresh.

**Fix:** In Next.js 15+, you can configure `staleTimes`:

```js
// next.config.js
module.exports = {
  experimental: {
    staleTimes: {
      dynamic: 0,  // don't cache dynamic pages on client
      static: 180,
    },
  },
}
```

## What I Wish Someone Had Told Me

- There are **4 independent caches** in Next.js: Request Memoization, Data Cache, Full Route Cache, Router Cache. `revalidatePath` only clears 2 of them.
- Running multiple instances without a shared cache handler is a silent bug — everything looks fine until traffic increases
- Add cache debug headers to your responses so you can see exactly which cache layer is serving a request
