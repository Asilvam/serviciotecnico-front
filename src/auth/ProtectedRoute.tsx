import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import {
  clearSession,
  getSession,
  getSessionStatus,
  setSessionRole,
} from './session.ts'
import type { AppRole } from './capabilities.ts'
import { getProfileRequest } from './authApi.ts'

type ProtectedRouteProps = {
  children: ReactNode
  allowedRoles?: AppRole[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const sessionStatus = getSessionStatus()
  const session = getSession()
  const [verifiedRole, setVerifiedRole] = useState<string | null>(null)
  const [verificationFailed, setVerificationFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (sessionStatus !== 'valid' || !session?.token) {
      return
    }

    const verifyCurrentRole = async () => {
      try {
        const profile = await getProfileRequest(session.token)
        if (cancelled) return
        if (!profile.role) {
          throw new Error('El perfil no tiene un rol valido.')
        }
        setSessionRole(profile.role)
        setVerifiedRole(profile.role)
      } catch {
        if (cancelled) return
        clearSession()
        setVerificationFailed(true)
      }
    }

    void verifyCurrentRole()
    return () => {
      cancelled = true
    }
  }, [session?.token, sessionStatus])

  if (sessionStatus !== 'valid' || verificationFailed) {
    return (
      <Navigate
        to="/"
        replace
        state={sessionStatus === 'expired' ? { sessionExpired: true } : undefined}
      />
    )
  }

  if (!verifiedRole) {
    return <div className="route-loading">Validando permisos...</div>
  }

  if (allowedRoles && !allowedRoles.includes(verifiedRole as AppRole)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
