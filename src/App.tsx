import { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getSession } from './auth/session.ts'
import { useLogout } from './auth/useLogout.ts'
import AppFooter from './components/AppFooter.tsx'
import homeHero from './assets/servicio-tecnico-home-1.jpg'
import homeThumbOne from './assets/servicio-tecnico-2.jpg'
import homeThumbTwo from './assets/servicio-tecnico-3.jpg'

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const session = getSession()
  const handleLogout = useLogout()
  const mediaItems = useMemo(
    () => [
      {
        src: homeHero,
        alt: 'Tecnico revisando un equipo de servicio',
      },
      {
        src: homeThumbOne,
        alt: 'Mesa de reparacion con herramientas de diagnostico',
      },
      {
        src: homeThumbTwo,
        alt: 'Tecnico realizando mantenimiento a dispositivo electronico',
      },
    ],
    [],
  )
  const [activeMediaIndex, setActiveMediaIndex] = useState(0)
  const activeMedia = mediaItems[activeMediaIndex] ?? mediaItems[0]

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

      <main className="container main-content home-main">
        <section className="panel home-panel home-panel-shell">
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
                src={activeMedia.src}
                alt={activeMedia.alt}
              />
              <div className="home-thumbs" aria-label="Galeria de imagenes">
                {mediaItems.map((item, index) => (
                  <button
                    key={item.src}
                    type="button"
                    className={`home-thumb-button ${index === activeMediaIndex ? 'is-active' : ''}`}
                    onClick={() => setActiveMediaIndex(index)}
                    aria-label={`Ver imagen ${index + 1}`}
                    aria-pressed={index === activeMediaIndex}
                  >
                    <img src={item.src} alt={item.alt} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  )
}

export default App
