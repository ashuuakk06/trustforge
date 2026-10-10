import crypto from 'node:crypto'

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import { config } from './config.js'
import { pool } from './db.js'
import type { AuthUser, Role } from './types.js'

export type AccessClaims = { sub: string; email: string; name: string; role: Role; type: 'access'; jti: string }
export class AuthError extends Error { statusCode = 401 }

export const hashPassword = (password: string) => bcrypt.hash(password, 12)
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash)
const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex')

export function createAccessToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name, role: user.role, type: 'access', jti: crypto.randomUUID() }, config.JWT_SECRET, { expiresIn: `${config.ACCESS_TOKEN_MINUTES}m`, issuer: 'trustforge' })
}

export async function createRefreshToken(userId: string, familyId = crypto.randomUUID()) {
  const id = crypto.randomUUID()
  const secret = crypto.randomBytes(48).toString('base64url')
  const raw = `${id}.${secret}`
  const expiresAt = new Date(Date.now() + config.REFRESH_TOKEN_DAYS * 86400_000)
  await pool.query('INSERT INTO refresh_tokens(id, user_id, family_id, token_hash, expires_at) VALUES ($1,$2,$3,$4,$5)', [id, userId, familyId, hashToken(raw), expiresAt])
  return { raw, familyId }
}

export async function rotateRefreshToken(raw: string) {
  const [id] = raw.split('.')
  if (!id) throw new AuthError('Refresh token is invalid, expired, or already used')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query<{ id: string; user_id: string; family_id: string; expires_at: Date; used_at: Date | null; revoked_at: Date | null }>('SELECT id,user_id,family_id,expires_at,used_at,revoked_at FROM refresh_tokens WHERE id=$1 FOR UPDATE', [id])
    const token = result.rows[0]
    const valid = token && !token.revoked_at && new Date(token.expires_at).getTime() > Date.now() && hashToken(raw) === await tokenHashFor(id, client)
    if (!valid) {
      if (token?.used_at) await client.query('UPDATE refresh_tokens SET revoked_at=NOW() WHERE family_id=$1', [token.family_id])
      await client.query('COMMIT')
      throw new AuthError('Refresh token is invalid, expired, or already used')
    }
    await client.query('UPDATE refresh_tokens SET used_at=NOW(), revoked_at=NOW() WHERE id=$1', [id])
    const next = crypto.randomUUID()
    const secret = crypto.randomBytes(48).toString('base64url')
    const rawNext = `${next}.${secret}`
    const expiresAt = new Date(Date.now() + config.REFRESH_TOKEN_DAYS * 86400_000)
    await client.query('INSERT INTO refresh_tokens(id,user_id,family_id,token_hash,expires_at) VALUES ($1,$2,$3,$4,$5)', [next, token.user_id, token.family_id, hashToken(rawNext), expiresAt])
    const userResult = await client.query<AuthUser>('SELECT id,email,name,role,active FROM users WHERE id=$1', [token.user_id])
    await client.query('COMMIT')
    const user = userResult.rows[0]
    if (!user) throw new AuthError('User no longer exists')
    return { user, refreshToken: rawNext }
  } catch (error) {
    try { await client.query('ROLLBACK') } catch { /* transaction may be closed */ }
    throw error
  } finally {
    client.release()
  }
}

async function tokenHashFor(id: string, client: { query: (text: string, values?: unknown[]) => Promise<{ rows: Array<{ token_hash: string }> }> }) {
  const result = await client.query('SELECT token_hash FROM refresh_tokens WHERE id=$1', [id])
  return result.rows[0]?.token_hash ?? ''
}

export async function revokeRefreshToken(raw: string) {
  const [id] = raw.split('.')
  if (id) await pool.query('UPDATE refresh_tokens SET revoked_at=NOW() WHERE id=$1', [id])
}

export function verifyAccessToken(token: string): AccessClaims {
  const claims = jwt.verify(token, config.JWT_SECRET, { issuer: 'trustforge' }) as AccessClaims
  if (claims.type !== 'access') throw new Error('Wrong token type')
  return claims
}
