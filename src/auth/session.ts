const TOKEN_KEY = 'auth_token'
const EMAIL_KEY = 'auth_user_email'
const EXPIRES_AT_KEY = 'expires_at'
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000

export type SessionData = {
  token: string
  email: string
  expiresAt: number
}

export type SessionStatus = 'valid' | 'expired' | 'missing'

function readStoredSession() {
  return {
    token: localStorage.getItem(TOKEN_KEY),
    email: localStorage.getItem(EMAIL_KEY),
    expiresAtRaw: localStorage.getItem(EXPIRES_AT_KEY),
  }
}

export function saveSession(token: string, email: string): SessionData {
  const expiresAt = Date.now() + SESSION_DURATION_MS
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(EMAIL_KEY, email)
  localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt))

  return { token, email, expiresAt }
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EMAIL_KEY)
  localStorage.removeItem(EXPIRES_AT_KEY)
}

export function getSessionStatus(): SessionStatus {
  const { token, email, expiresAtRaw } = readStoredSession()

  if (!token || !email || !expiresAtRaw) {
    clearSession()
    return 'missing'
  }

  const expiresAt = Number(expiresAtRaw)
  if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) {
    clearSession()
    return 'expired'
  }

  return 'valid'
}

export function getSession(): SessionData | null {
  if (getSessionStatus() !== 'valid') {
    return null
  }

  const { token, email, expiresAtRaw } = readStoredSession()

  if (!token || !email || !expiresAtRaw) {
    return null
  }

  const expiresAt = Number(expiresAtRaw)

  return { token, email, expiresAt }
}

export function isAuthenticated(): boolean {
  return getSession() !== null
}

export function cleanupExpiredSession(): void {
  getSessionStatus()
}


