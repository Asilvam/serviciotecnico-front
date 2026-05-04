import { useEffect } from 'react'
import Swal from 'sweetalert2'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { clearSession, getSession } from './auth/session.ts'
import homeHero from './assets/servicio-tecnico-home-1.jpg'
import homeThumbOne from './assets/servicio-tecnico-2.jpg'
import homeThumbTwo from './assets/servicio-tecnico-3.jpg'

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
      confirmButtonColor: '#2c5f7c',
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
      confirmButtonColor: '#2c5f7c',
      cancelButtonColor: '#7f8c8d',
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
          <div className="home-hero">
            <div className="home-copy">
              <h1>Sistema Servicio Tecnico</h1>
              <p>
                Gestiona ordenes, clientes y procesos de soporte desde una
                interfaz optimizada para tablet y escritorio.
              </p>
              <div className="home-actions">
                <Link
                  to={session ? '/dashboard' : '/login'}
                  className="btn btn-primary"
                >
                  {session ? 'Ir al dashboard' : 'Iniciar sesion'}
                </Link>
              </div>
            </div>
            <div className="home-media">
              <img
                className="home-hero-image"
                src={homeHero}
                alt="Tecnico revisando un equipo de servicio"
              />
              <div className="home-thumbs" aria-hidden="true">
                <img src={homeThumbOne} alt="" />
                <img src={homeThumbTwo} alt="" />
              </div>
            </div>
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
