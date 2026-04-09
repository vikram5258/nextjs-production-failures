# Next.js in Production — What Actually Breaks

I've been building and shipping Next.js apps for a few years now — e-commerce platforms, SaaS dashboards, AI-integrated products. Along the way I've hit bugs that had no Stack Overflow answer, GitHub issues with 200+ comments and no resolution, and failures that only showed up after deployment.

This repo documents **real failure modes** I've encountered or investigated — with minimal reproductions and working fixes.

This isn't a best practices list. It's a forensics report.

---

## Failures Covered

| # | Failure | Severity |
|---|---|---|
| [01](./01-memory-leak/) | Memory leaks that kill your container | 🔴 Critical |
| [02](./02-isr-cache/) | ISR & cache invalidation that lies to you | 🔴 Critical |
| [03](./03-hydration/) | Hydration errors that only appear in production | 🟡 Medium |
| [04](./04-middleware/) | Middleware gotchas that silently fail | 🟡 Medium |
| [05](./05-build-oom/) | Build OOM crashes on large apps | 🟠 High |
| [06](./06-server-component-leak/) | Server component data leaks | 🔴 Critical |

---

## How to Use This Repo

Each folder has:
- `reproduce/` — minimal Next.js app that triggers the bug
- `fixed/` — the working solution
- `notes.md` — root cause, what I tried, what worked

To run any reproduction:

```bash
cd 01-memory-leak/reproduce
npm install
npm run dev # or npm run build
```

---

## Stack

- Next.js 15 / 16 (App Router)
- Node.js 20+
- Docker (for container-specific failures)

---

## Related Article

I wrote a detailed breakdown of each failure with context from real projects:
> *Coming soon on LinkedIn and Medium*

---

## Contributing

If you've hit a Next.js production failure that isn't covered here, open an issue or PR. I want this to be a living document.
