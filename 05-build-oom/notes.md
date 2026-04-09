# 05 — Build OOM Crashes on Large Apps

## The Symptom

```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

During `next build`. Local machine, CI pipeline, or deployment server. The build just dies.

## Why It Happens

`next build` runs type-checking, linting, static analysis, and page compilation all in the same Node.js process. On large apps with many pages, heavy dependencies, or lots of static generation, this blows through Node's default heap limit (~1.5GB).

## Fixes (in order of preference)

### 1. Increase Node heap size

```bash
NODE_OPTIONS="--max-old-space-size=4096" next build
```

Set this in your `package.json`:

```json
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
  }
}
```

In GitHub Actions:
```yaml
- name: Build
  run: npm run build
  env:
    NODE_OPTIONS: '--max-old-space-size=4096'
```

### 2. Disable type-checking and linting during build

Move these to separate CI steps:

```js
// next.config.js
module.exports = {
  typescript: {
    ignoreBuildErrors: true, // run tsc separately
  },
  eslint: {
    ignoreDuringBuilds: true, // run eslint separately
  },
}
```

```yaml
# CI pipeline
- run: npx tsc --noEmit
- run: npx eslint .
- run: next build
```

### 3. Limit concurrent page generation

```js
// next.config.js
module.exports = {
  experimental: {
    workerThreads: false,
    cpus: 1, // reduce parallelism
  },
}
```

### 4. Audit your dependencies

Some packages pull in enormous dependency trees. Run:

```bash
npx cost-of-modules
```

A few heavy packages I've found leaking into builds:
- `moment` (use `date-fns` instead)
- `lodash` imported as `import _ from 'lodash'` (use named imports)
- Large icon libraries imported wholesale

## What I Wish Someone Had Told Me

- The OOM usually isn't caused by your code — it's triggered by a dependency you're not thinking about
- `next build --debug` gives you a breakdown of what's taking memory and time
- In CI, always set `--max-old-space-size` — the default is based on the machine's RAM, and CI runners often have less than your dev machine
