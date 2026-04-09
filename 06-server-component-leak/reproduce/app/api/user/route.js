// ❌ BUG: module-level cache leaks user data across requests
// To reproduce:
//   1. Make a request with ?userId=1 — user A's data gets cached
//   2. Make a request with ?userId=2 — still returns user A's data
//   This simulates what happens when different authenticated users hit the same server

let cachedUser = null

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || '1'

  // Simulates a DB call that gets cached incorrectly
  if (!cachedUser) {
    cachedUser = await fakeDbLookup(userId)
  }

  return Response.json({
    requestedUserId: userId,
    returnedUser: cachedUser,
    leaked: cachedUser.id !== userId,
  })
}

async function fakeDbLookup(id) {
  // Simulate async DB call
  await new Promise(r => setTimeout(r, 10))
  return {
    id,
    email: `user${id}@example.com`,
    name: `User ${id}`,
    role: id === '1' ? 'admin' : 'viewer',
  }
}
