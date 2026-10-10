import cors from 'cors'
import express from 'express'
import helmet from 'helmet'

import { config } from './config.js'
import { authenticate, errorHandler, notFound, requestId } from './middleware.js'
import authRoutes from './routes/authRoutes.js'
import platformRoutes from './routes/platformRoutes.js'

export const app = express()
app.disable('x-powered-by')
app.use(helmet())
app.use(cors({ origin: config.CORS_ORIGIN.split(',').map((origin) => origin.trim()), credentials: true }))
app.use(express.json({ limit: '256kb' }))
app.use(requestId)
app.use(authenticate)
app.get('/health', (_req, res) => res.json({ status: 'UP', service: 'trustforge-api' }))
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1', platformRoutes)
app.use(notFound)
app.use(errorHandler)
