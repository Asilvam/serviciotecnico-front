import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { getSession } from '../auth/session.ts'
import { useLogout } from '../auth/useLogout.ts'

type AdminLayoutProps = {
  title: string
  subtitle: string
  actionLabel: string
  onAction: () => void
  children: ReactNode
}

export default function AdminLayout({
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
}: AdminLayoutProps) {
  const session = getSession()
  const handleLogout = useLogout()

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <Link to="/" className="brand">
            Servicio Tecnico
          </Link>
          <nav className="topbar-actions">
            <span className="session-email">{session?.email}</span>
            <Link to="/dashboard" className="btn btn-secondary">
              Dashboard
            </Link>
            <button type="button" className="btn btn-ghost" onClick={handleLogout}>
              Cerrar sesion
            </button>
          </nav>
        </div>
      </header>

      <main className="container main-content admin-main">
        <section className="panel admin-panel">
          <div className="admin-header">
            <div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            <button className="btn btn-primary" type="button" onClick={onAction}>
              {actionLabel}
            </button>
          </div>
          {children}
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <span>Servicio Tecnico</span>
          <span>v{__APP_VERSION__}</span>
        </div>
      </footer>
    </div>
  )
}
