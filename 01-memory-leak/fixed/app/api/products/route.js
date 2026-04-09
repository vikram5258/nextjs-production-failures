import { readFile } from 'fs/promises'
import path from 'path'

// ✅ FIX: cache the Promise — file is read and parsed exactly once,
// no matter how many concurrent requests arrive before it resolves.
// All subsequent requests get the cached result instantly.
let productsPromise = null

function getProducts() {
  if (!productsPromise) {
    productsPromise = readFile(
      path.join(process.cwd(), 'data/products.json'),
      'utf-8'
    ).then(raw => JSON.parse(raw).products)
  }
  return productsPromise
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')

  const products = await getProducts()

  const filtered = category
    ? products.filter(p => p.category === category)
    : products

  return Response.json({
    products: filtered.slice(0, 20),
    total: filtered.length,
  })
}
