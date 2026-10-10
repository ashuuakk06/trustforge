import { Router } from 'express'
import { z } from 'zod'

import { createAccessToken, createRefreshToken, hashPassword, revokeRefreshToken, rotateRefreshToken, verifyPassword } from '../auth.js'
import { authRateLimit, requireAuth } from '../middleware.js'
import { service } from '../services/trustforgeService.js'

const router = Router()
const credentials = z.object({ email: z.string().email().max(255), password: z.string().min(8).max(128) })
const registration = credentials.extend({ name: z.string().trim().min(2).max(80) })
const response = (user: Awaited<ReturnType<typeof service.userById>>, refreshToken: string) => ({ accessToken: createAccessToken(user!), refreshToken, user })

router.post('/login', authRateLimit, async (req, res, next) => {
  try {
    const body = credentials.parse(req.body)
    const user = await service.userByEmail(body.email)
    if (!user || !user.active || !(await verifyPassword(body.password, user.passwordHash))) return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect', requestId: req.id })
    const refresh = await createRefreshToken(user.id)
    res.json(response(user, refresh.raw))
  } catch (error) { next(error) }
})

router.post('/register', authRateLimit, async (req, res, next) => {
  try {
    const body = registration.parse(req.body)
    const user = await service.register(body.email, body.name, await hashPassword(body.password))
    const refresh = await createRefreshToken(user.id)
    res.status(201).json(response(user, refresh.raw))
  } catch (error) { next(error) }
})

router.post('/refresh', authRateLimit, async (req, res, next) => {
  try {
    const token = z.object({ refreshToken: z.string().min(20) }).parse(req.body).refreshToken
    const rotated = await rotateRefreshToken(token)
    res.json(response(rotated.user, rotated.refreshToken))
  } catch (error) { next(error) }
})

router.post('/logout', requireAuth, async (req, res, next) => {
  try { const token = z.object({ refreshToken: z.string().min(20) }).safeParse(req.body).data?.refreshToken; if (token) await revokeRefreshToken(token); res.status(204).send() } catch (error) { next(error) }
})

router.get('/me', requireAuth, async (req, res, next) => {
  try { const user = await service.userById(req.user!.id); if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Account no longer exists' }); res.json(user) } catch (error) { next(error) }
})

export default router
