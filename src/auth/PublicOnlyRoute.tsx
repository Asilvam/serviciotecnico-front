import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { getSessionStatus } from './session.ts'

type PublicOnlyRouteProps = {
  children: ReactNode
}

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  if (getSessionStatus() === 'valid') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

