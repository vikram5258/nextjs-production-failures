import { readFile } from 'fs/promises'
import path from 'path'

// ❌ BUG: reads and parses the entire 4MB products.json on every request
// Under concurrent load each in-flight request holds its own 4MB parsed object.
// 50 concurrent requests = 200MB of duplicated data in memory.
// GC can't keep up — heap climbs until the container OOMs.
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')

  // This read + parse on every request is the leak
  const raw = await readFile(
    path.join(process.cwd(), 'data/products.json'),
    'utf-8'
  )
  const { products } = JSON.parse(raw)

  const filtered = category
    ? products.filter(p => p.category === category)
    : products

  return Response.json({
    products: filtered.slice(0, 20),
    total: filtered.length,
  })
}
