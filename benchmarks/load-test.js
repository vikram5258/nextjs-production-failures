#!/usr/bin/env node
/**
 * Sustained concurrent load test for Next.js memory leak benchmarking.
 *
 * Usage:
 *   node benchmarks/load-test.js <port> <label> [concurrency] [duration_ms]
 *
 * Examples:
 *   node benchmarks/load-test.js 3001 BUGGY
 *   node benchmarks/load-test.js 3002 FIXED 30 60000
 *
 * Keeps N requests always in-flight and samples /api/memory every 3 seconds.
 * Results are written to results/<label>-<timestamp>.json for later comparison.
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const port       = process.argv[2] || '3001'
const label      = process.argv[3] || 'server'
const CONCURRENCY = parseInt(process.argv[4] || '30')
const DURATION_MS = parseInt(process.argv[5] || '30000')

const ENDPOINT    = `/api/products?category=Electronics`
const MEMORY_URL  = `http://localhost:${port}/api/memory`
const TARGET_URL  = `http://localhost:${port}${ENDPOINT}`

let completed = 0
let errors    = 0
let inFlight  = 0
const snapshots = []

async function makeRequest(n) {
  inFlight++
  try {
    const res = await fetch(TARGET_URL)
    await res.arrayBuffer()
    completed++
  } catch {
    errors++
  } finally {
    inFlight--
  }
}

async function snapshot() {
  try {
    const res = await fetch(MEMORY_URL)
    const mem = await res.json()
    return { ...mem, requests: completed, errors, timestamp: Date.now() }
  } catch {
    return null
  }
}

function parseNum(str) {
  return parseInt(str?.replace(' MB', '') || '0')
}

async function run() {
  console.log(`\n[${ label }] ─────────────────────────────────────────`)
  console.log(`[${ label }] Sustained load test`)
  console.log(`[${ label }] Endpoint : ${ TARGET_URL }`)
  console.log(`[${ label }] Concurrency: ${ CONCURRENCY } | Duration: ${ DURATION_MS / 1000 }s`)
  console.log(`[${ label }] ─────────────────────────────────────────`)

  const baseline = await snapshot()
  if (!baseline) { console.error(`[${ label }] Server not reachable on port ${ port }`); process.exit(1) }

  console.log(`[${ label }] Baseline  rss=${ baseline.rss }  heap=${ baseline.heapUsed }`)
  console.log(`[${ label }]`)
  console.log(`[${ label }]  time    rss         heap        total_req`)

  const start = Date.now()
  let reqNum  = 0

  const intervalId = setInterval(async () => {
    const s = await snapshot()
    if (!s) {
      console.log(`[${ label }] !! Server stopped responding after ${ completed } requests`)
      clearInterval(intervalId)
      process.exit(1)
    }
    snapshots.push(s)
    const elapsed = Math.round((Date.now() - start) / 1000)
    const rss  = s.rss.padStart(9)
    const heap = s.heapUsed.padStart(9)
    console.log(`[${ label }] ${ String(elapsed).padStart(4) }s   ${ rss }   ${ heap }   ${ String(completed).padStart(7) }`)
  }, 3000)

  while (Date.now() - start < DURATION_MS) {
    while (inFlight < CONCURRENCY) makeRequest(++reqNum)
    await new Promise(r => setTimeout(r, 10))
  }

  clearInterval(intervalId)

  const final = await snapshot()
  snapshots.push(final)

  const rssValues  = snapshots.map(s => parseNum(s.rss))
  const heapValues = snapshots.map(s => parseNum(s.heapUsed))
  const maxRss     = Math.max(...rssValues)
  const maxHeap    = Math.max(...heapValues)
  const throughput = Math.round(completed / (DURATION_MS / 1000))

  console.log(`[${ label }]`)
  console.log(`[${ label }] ── Summary ───────────────────────────────`)
  console.log(`[${ label }] Requests served : ${ completed.toLocaleString() }`)
  console.log(`[${ label }] Errors          : ${ errors }`)
  console.log(`[${ label }] Throughput      : ~${ throughput } req/s`)
  console.log(`[${ label }] Baseline RSS    : ${ baseline.rss }`)
  console.log(`[${ label }] Peak RSS        : ${ maxRss } MB`)
  console.log(`[${ label }] Baseline heap   : ${ baseline.heapUsed }`)
  console.log(`[${ label }] Peak heap       : ${ maxHeap } MB`)
  console.log(`[${ label }] ─────────────────────────────────────────`)

  // Save results for comparison
  const result = {
    label,
    port,
    concurrency: CONCURRENCY,
    durationMs: DURATION_MS,
    baseline,
    summary: { requests: completed, errors, throughput, maxRss, maxHeap },
    snapshots,
  }

  mkdirSync(join(__dirname, '../results/01-memory-leak'), { recursive: true })
  const outFile = join(__dirname, `../results/01-memory-leak/${ label.toLowerCase() }-${ Date.now() }.json`)
  writeFileSync(outFile, JSON.stringify(result, null, 2))
  console.log(`[${ label }] Results saved: ${ outFile }`)
}

run().catch(console.error)
