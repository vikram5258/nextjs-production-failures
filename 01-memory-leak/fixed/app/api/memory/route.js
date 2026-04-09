// Helper endpoint to observe memory growth
// Hit /api/memory repeatedly while hammering /api/og to see the leak
export async function GET() {
  const mem = process.memoryUsage()
  return Response.json({
    rss: `${Math.round(mem.rss / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)} MB`,
    external: `${Math.round(mem.external / 1024 / 1024)} MB`,
  })
}
