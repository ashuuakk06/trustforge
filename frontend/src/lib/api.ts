import type { ApiError, User } from '../types'

const API = import.meta.env.VITE_API_URL ?? ''
const accessKey = 'trustforge.access'
const refreshKey = 'trustforge.refresh'
export const getAccess = () => localStorage.getItem(accessKey)
export const setTokens = (access: string, refresh: string) => { localStorage.setItem(accessKey, access); localStorage.setItem(refreshKey, refresh) }
export const clearTokens = () => { localStorage.removeItem(accessKey); localStorage.removeItem(refreshKey) }

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  const access = getAccess(); if (access) headers.set('Authorization', `Bearer ${access}`)
  let response = await fetch(`${API}${path}`, { ...options, headers })
  if (response.status === 401 && localStorage.getItem(refreshKey)) {
    const refreshResponse = await fetch(`${API}/api/v1/auth/refresh`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ refreshToken: localStorage.getItem(refreshKey) }) })
    if (refreshResponse.ok) { const refreshed = await refreshResponse.json(); setTokens(refreshed.accessToken, refreshed.refreshToken); headers.set('Authorization', `Bearer ${refreshed.accessToken}`); response = await fetch(`${API}${path}`, { ...options, headers }) }
  }
  if (!response.ok) { const body = await response.json().catch(() => ({})) as ApiError; throw new Error(body.message ?? body.error ?? `Request failed (${response.status})`) }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
export async function login(email: string, password: string) { const result = await api<{accessToken:string; refreshToken:string; user:User}>('/api/v1/auth/login', {method:'POST', body:JSON.stringify({email,password})}); setTokens(result.accessToken, result.refreshToken); return result.user }
export const logout = async () => { const refresh = localStorage.getItem(refreshKey); if (refresh) await api('/api/v1/auth/logout', {method:'POST', body:JSON.stringify({refreshToken:refresh})}).catch(() => undefined); clearTokens() }
