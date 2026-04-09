// ✅ FIX: use React cache() for per-request memoization
// cache() deduplicates within a single request, but is never shared across requests
import { cache } from 'react'

const getUser = cache(async (id) => {
  return await fakeDbLookup(id)
})

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || '1'

  const user = await getUser(userId)

  return Response.json({
    requestedUserId: userId,
    returnedUser: user,
    leaked: user.id !== userId,
  })
}

async function fakeDbLookup(id) {
  await new Promise(r => setTimeout(r, 10))
  return {
    id,
    email: `user${id}@example.com`,
    name: `User ${id}`,
    role: id === '1' ? 'admin' : 'viewer',
  }
}
