import crypto from 'node:crypto'

import type { NextFunction, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'

import { verifyAccessToken } from './auth.js'
import type { AuthUser, Role } from './types.js'

declare global {
  namespace Express { interface Request { id: string; user?: AuthUser } }
}

export function requestId(req: Request, res: Response, next: NextFunction) {
  req.id = req.header('X-Request-ID')?.slice(0, 80) || crypto.randomUUID()
  res.setHeader('X-Request-ID', req.id)
  const started = Date.now()
  res.on('finish', () => console.log(JSON.stringify({ level: 'info', requestId: req.id, method: req.method, path: req.originalUrl, status: res.statusCode, durationMs: Date.now() - started })))
  next()
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('Authorization')
  if (!header?.startsWith('Bearer ')) return next()
  try {
    const claims = verifyAccessToken(header.slice(7))
    req.user = { id: claims.sub, email: claims.email, name: claims.name, role: claims.role, active: true }
  } catch {
    // The route-level auth guard returns the safe 401 response.
  }
  next()
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'A valid access token is required', requestId: req.id })
  next()
}

export function requireRoles(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'A valid access token is required', requestId: req.id })
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'FORBIDDEN', message: 'You do not have permission for this action', requestId: req.id })
    next()
  }
}

export const authRateLimit = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'RATE_LIMITED', message: 'Too many authentication attempts; try again later' } })
export const writeRateLimit = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false })

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'NOT_FOUND', message: 'The requested resource was not found' })
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  const status = error instanceof z.ZodError ? 422 : typeof error === 'object' && error && 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500
  const message = status >= 500 ? 'An unexpected server error occurred' : error instanceof Error ? error.message : 'Request failed'
  console.error(JSON.stringify({ level: 'error', requestId: req.id, error: error instanceof Error ? error.message : error }))
  res.status(status).json({ error: status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR', message, requestId: req.id })
}
