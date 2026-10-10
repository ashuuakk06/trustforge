import { Redis } from 'ioredis'

import { config } from './config.js'

export const redis = new Redis(config.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false })
redis.on('error', () => undefined)

export async function cacheJson<T>(key: string, value: T, seconds: number): Promise<void> {
  try {
    if (redis.status === 'wait') await redis.connect()
    await redis.set(key, JSON.stringify(value), 'EX', seconds)
  } catch {
    // Cache failure must never make correctness-critical workflows fail.
  }
}

export async function readCache<T>(key: string): Promise<T | undefined> {
  try {
    if (redis.status === 'wait') await redis.connect()
    const value = await redis.get(key)
    return value ? JSON.parse(value) as T : undefined
  } catch {
    return undefined
  }
}

export async function closeRedis() {
  if (redis.status !== 'end') await redis.quit().catch(() => undefined)
}
