import { app } from './app.js'
import { config } from './config.js'
import { closeDatabase, pool } from './db.js'
import { closeRedis } from './redis.js'
import { migrate } from './scripts/migrate.js'
import { seed } from './scripts/seed.js'
import { service } from './services/trustforgeService.js'

await migrate()
if (config.SEED_DEMO) await seed()
await service.resumeProcessing()
const server = app.listen(config.PORT, () => console.log(JSON.stringify({ level: 'info', message: 'TrustForge API listening', port: config.PORT })))

const shutdown = async (signal: string) => {
  console.log(JSON.stringify({ level: 'info', message: 'Shutting down', signal }))
  server.close(async () => { await closeRedis(); await closeDatabase(); process.exit(0) })
}
process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

process.on('uncaughtException', (error) => { console.error(error); server.close(() => process.exit(1)) })
process.on('unhandledRejection', (error) => { console.error(error); server.close(() => process.exit(1)) })

void pool
