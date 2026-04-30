import Swal from 'sweetalert2'
import { Link, useNavigate } from 'react-router-dom'
import { clearSession, getSession } from '../auth/session.ts'

export default function DashboardPage() {
  const navigate = useNavigate()
  const session = getSession()

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Cerrar sesion',
      text: 'Se cerrara tu sesion actual en este dispositivo.',
      showCancelButton: true,
      confirmButtonText: 'Si, salir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2456f5',
      cancelButtonColor: '#98a2b3',
    })

    if (!result.isConfirmed) {
      return
    }

    clearSession()
    navigate('/', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <Link to="/" className="brand">
            Servicio Tecnico
          </Link>
          <nav className="topbar-actions">
            <span className="session-email">{session?.email}</span>
            <button type="button" className="btn btn-ghost" onClick={handleLogout}>
              Cerrar sesion
            </button>
          </nav>
        </div>
      </header>

      <main className="container main-content">
        <section className="panel dashboard-panel">
          <h1>Dashboard</h1>
          <p>Sesion activa para: {session?.email}</p>
          <p>Bienvenido al modulo inicial de gestion.</p>
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


