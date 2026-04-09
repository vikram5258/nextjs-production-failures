/**
 * Custom Next.js cache handler using Redis.
 * Shared across all instances — fixes multi-pod cache invalidation.
 *
 * Setup:
 *   npm install ioredis
 *
 * next.config.js:
 *   module.exports = {
 *     cacheHandler: require.resolve('./cache-handler.js'),
 *     cacheMaxMemorySize: 0, // disable in-memory cache
 *   }
 */

const Redis = require('ioredis')

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

module.exports = class CacheHandler {
  constructor(options) {
    this.options = options
  }

  async get(key) {
    const data = await redis.get(key)
    if (!data) return null
    return JSON.parse(data)
  }

  async set(key, data, ctx) {
    const ttl = ctx.revalidate ? ctx.revalidate : 3600
    await redis.set(key, JSON.stringify(data), 'EX', ttl)
  }

  async revalidateTag(...tags) {
    // In production you'd want a smarter tag → key mapping
    // This is a simple approach: store tag → [keys] index in Redis
    for (const tag of tags) {
      const keys = await redis.smembers(`tag:${tag}`)
      if (keys.length > 0) {
        await redis.del(...keys)
        await redis.del(`tag:${tag}`)
      }
    }
  }
}
