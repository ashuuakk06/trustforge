import pg from 'pg'

import { config } from './config.js'

const { Pool } = pg
export const pool = new Pool({ connectionString: config.DATABASE_URL, max: 15, idleTimeoutMillis: 30_000 })

export type Queryable = Pick<pg.Pool, 'query'> | Pick<pg.PoolClient, 'query'>

export async function withTransaction<T>(work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const value = await work(client)
    await client.query('COMMIT')
    return value
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function closeDatabase() {
  await pool.end()
}
