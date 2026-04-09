/**
 * Programmatic heap snapshot for diagnosing memory leaks.
 * Run this while your Next.js app is under load.
 *
 * Usage:
 *   node scripts/heap-snapshot.js
 *
 * Then open the generated .heapsnapshot file in Chrome DevTools:
 *   DevTools → Memory → Load snapshot
 */

const v8 = require('v8')
const fs = require('fs')
const path = require('path')

function takeSnapshot(label = 'snapshot') {
  const snapshotStream = v8.writeHeapSnapshot()
  const dest = path.join(__dirname, `${label}-${Date.now()}.heapsnapshot`)
  fs.renameSync(snapshotStream, dest)
  console.log(`Snapshot written to: ${dest}`)
  return dest
}

function logMemory(label = '') {
  const mem = process.memoryUsage()
  console.log(`[${label}] Memory:`, {
    rss: `${Math.round(mem.rss / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)} MB`,
  })
}

// Take a baseline, then another after load
// Compare the two snapshots in DevTools to find growing allocations
logMemory('baseline')
takeSnapshot('baseline')

console.log('\nNow hit your app with load, then press Enter to take a second snapshot...')
process.stdin.once('data', () => {
  logMemory('after-load')
  takeSnapshot('after-load')
  process.exit(0)
})
