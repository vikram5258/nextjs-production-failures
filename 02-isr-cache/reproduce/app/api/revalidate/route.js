import { revalidatePath } from 'next/cache'

// Call this on instance 1, then check /products on instance 2 — still stale
export async function POST() {
  revalidatePath('/products')
  return Response.json({
    revalidated: true,
    serverId: process.env.SERVER_ID || 'unknown',
    message: 'Cache cleared on this instance only. Other instances unaffected.',
  })
}
