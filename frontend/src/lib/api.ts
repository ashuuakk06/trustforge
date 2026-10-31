import type { ApiError, SubmissionDraft, SubmissionEvent, SubmissionResponse, User } from '../types'

const API = import.meta.env.VITE_API_URL ?? ''
const accessKey = 'trustforge.access'
const refreshKey = 'trustforge.refresh'
export const getAccess = () => localStorage.getItem(accessKey)
export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem(accessKey, access)
  localStorage.setItem(refreshKey, refresh)
}
export const clearTokens = () => {
  localStorage.removeItem(accessKey)
  localStorage.removeItem(refreshKey)
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  const access = getAccess()
  if (access) headers.set('Authorization', `Bearer ${access}`)
  let response = await fetch(`${API}${path}`, { ...options, headers })
  if (response.status === 401 && localStorage.getItem(refreshKey)) {
    const refreshResponse = await fetch(`${API}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: localStorage.getItem(refreshKey) }),
    })
    if (refreshResponse.ok) {
      const refreshed = await refreshResponse.json()
      setTokens(refreshed.accessToken, refreshed.refreshToken)
      headers.set('Authorization', `Bearer ${refreshed.accessToken}`)
      response = await fetch(`${API}${path}`, { ...options, headers })
    } else clearTokens()
  }
  if (!response.ok) {
    if (response.status === 401) clearTokens()
    const body = (await response.json().catch(() => ({}))) as ApiError
    throw new Error(body.message ?? body.error ?? `Request failed (${response.status})`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
export async function login(email: string, password: string) {
  const result = await api<{ accessToken: string; refreshToken: string; user: User }>(
    '/api/v1/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
  )
  setTokens(result.accessToken, result.refreshToken)
  return result.user
}
export const logout = async () => {
  const refresh = localStorage.getItem(refreshKey)
  if (refresh)
    await api('/api/v1/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: refresh }),
    }).catch(() => undefined)
  clearTokens()
}

export const createSubmission = (draft: SubmissionDraft) =>
  api<SubmissionResponse>('/api/v1/submissions', { method: 'POST', body: JSON.stringify(draft) })

export function pollSubmissionEvents(
  id: string,
  onEvents: (events: SubmissionEvent[]) => void,
  onComplete: (status: string) => void,
  onError: (error: Error) => void,
) {
  let stopped = false
  let timer: number | undefined
  let afterSequence = 0
  let pollingErrorShown = false
  const run = async () => {
    if (stopped) return
    try {
      const result = await api<{ items: SubmissionEvent[]; status: string }>(
        `/api/v1/submissions/${encodeURIComponent(id)}/events?afterSequence=${afterSequence}`,
      )
      if (stopped) return
      if (result.items.length) {
        afterSequence = Math.max(afterSequence, ...result.items.map((event) => event.sequence))
        onEvents(result.items)
      }
      pollingErrorShown = false
      if (result.status === 'READY' || result.status === 'FAILED') {
        onComplete(result.status)
        return
      }
      timer = window.setTimeout(run, 1200)
    } catch (error) {
      if (stopped) return
      if (!pollingErrorShown) {
        onError(error instanceof Error ? error : new Error('Could not check submission status'))
        pollingErrorShown = true
      }
      timer = window.setTimeout(run, 3000)
    }
  }
  void run()
  return () => {
    stopped = true
    if (timer !== undefined) window.clearTimeout(timer)
  }
}
