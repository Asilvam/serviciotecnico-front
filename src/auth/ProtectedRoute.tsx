import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { getSessionStatus } from './session.ts'

type ProtectedRouteProps = {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const sessionStatus = getSessionStatus()

  if (sessionStatus !== 'valid') {
    return (
      <Navigate
        to="/"
        replace
        state={sessionStatus === 'expired' ? { sessionExpired: true } : undefined}
      />
    )
  }

  return children
}


