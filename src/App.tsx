import { useEffect } from 'react'
import Swal from 'sweetalert2'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { clearSession, getSession } from './auth/session.ts'

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const session = getSession()

  useEffect(() => {
    if (!location.state || typeof location.state !== 'object') {
      return
    }

    const state = location.state as { sessionExpired?: boolean }
    if (!state.sessionExpired) {
      return
    }

    void Swal.fire({
      icon: 'warning',
      title: 'Sesion expirada',
      text: 'Tu sesion ha expirado por seguridad. Inicia sesion nuevamente para continuar.',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#2456f5',
    }).finally(() => {
      navigate('/', { replace: true })
    })
  }, [location.state, navigate])

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
          <nav className="topbar-actions" aria-label="Main navigation">
            {session ? (
              <>
                <span className="session-email">{session.email}</span>
                <Link to="/dashboard" className="btn btn-secondary">
                  Dashboard
                </Link>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleLogout}
                >
                  Salir
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary">
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="container main-content">
        <section className="panel home-panel">
          <h1>Sistema Servicio Tecnico</h1>
          <p>
            Gestiona ordenes, clientes y procesos de soporte desde una interfaz
            optimizada para tablet y escritorio.
          </p>
          <div className="home-actions">
            <Link
              to={session ? '/dashboard' : '/login'}
              className="btn btn-primary"
            >
              {session ? 'Ir al dashboard' : 'Iniciar sesion'}
            </Link>
          </div>
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

export default App
