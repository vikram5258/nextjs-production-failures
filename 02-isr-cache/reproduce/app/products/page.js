// Reproduces the multi-instance ISR stale cache problem.
//
// Setup: run two Next.js instances behind nginx (see reproduce/nginx.conf)
// Then hit /api/revalidate on instance 1 — instance 2 still serves stale data.

export const revalidate = 30

async function getProducts() {
  // In a real scenario this hits your database
  // Here we use a timestamp to make staleness obvious
  return {
    products: [
      { id: 1, name: 'Widget', price: 9.99 },
      { id: 2, name: 'Gadget', price: 19.99 },
    ],
    generatedAt: new Date().toISOString(),
    serverId: process.env.SERVER_ID || 'unknown',
  }
}

export default async function ProductsPage() {
  const data = await getProducts()

  return (
    <div>
      <h1>Products</h1>
      <ul>
        {data.products.map(p => (
          <li key={p.id}>{p.name} — ${p.price}</li>
        ))}
      </ul>
      <p style={{ color: '#888', fontSize: '12px' }}>
        Generated: {data.generatedAt} on server {data.serverId}
      </p>
    </div>
  )
}
