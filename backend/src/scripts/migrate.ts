import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { pool, closeDatabase } from '../db.js'

export async function migrate() {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())')
  const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../migrations')
  const files = (await fs.readdir(directory)).filter((file) => file.endsWith('.sql')).sort()
  for (const file of files) {
    const version = file.replace(/\.sql$/, '')
    const alreadyApplied = await pool.query('SELECT 1 FROM schema_migrations WHERE version=$1', [version])
    if (alreadyApplied.rowCount) continue
    const sql = await fs.readFile(path.join(directory, file), 'utf8')
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations(version) VALUES ($1) ON CONFLICT DO NOTHING', [version])
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}

if (process.argv[1]?.endsWith('migrate.ts')) {
  migrate().then(() => closeDatabase()).catch(async (error) => { console.error(error); await closeDatabase(); process.exitCode = 1 })
}
