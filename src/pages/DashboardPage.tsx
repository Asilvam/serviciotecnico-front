import { Link } from 'react-router-dom'
import { getSession } from '../auth/session.ts'
import { useLogout } from '../auth/useLogout.ts'

export default function DashboardPage() {
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
            <button type="button" className="btn btn-ghost" onClick={handleLogout}>
              Cerrar sesion
            </button>
          </nav>
        </div>
      </header>

      <main className="container main-content admin-main">
        <section className="panel dashboard-panel">
          <div className="dashboard-header">
            <div>
              <h1>Dashboard</h1>
              <p>Sesion activa para: {session?.email}</p>
              <p>Accesos rapidos a los modulos administrativos.</p>
            </div>
          </div>

          <div className="dashboard-grid">
            <Link to="/customers" className="dashboard-card">
              <span className="card-label">Clientes</span>
              <h2>Customers</h2>
              <p>Gestiona datos, contacto y estado de clientes.</p>
              <span className="card-cta">Administrar clientes</span>
            </Link>
            <Link to="/technicians" className="dashboard-card">
              <span className="card-label">Tecnicos</span>
              <h2>Technicians</h2>
              <p>Controla especialidades, contacto y disponibilidad.</p>
              <span className="card-cta">Administrar tecnicos</span>
            </Link>
            <Link to="/products" className="dashboard-card">
              <span className="card-label">Productos</span>
              <h2>Productos (incluye servicios)</h2>
              <p>Inventario, precios y stock de repuestos y servicios.</p>
              <span className="card-cta">Administrar productos</span>
            </Link>
            <Link to="/service-orders" className="dashboard-card">
              <span className="card-label">Ordenes</span>
              <h2>Ordenes de servicio</h2>
              <p>Seguimiento de estado, prioridad y atencion de cada solicitud.</p>
              <span className="card-cta">Administrar ordenes</span>
            </Link>
            <Link to="/users" className="dashboard-card">
              <span className="card-label">Usuarios</span>
              <h2>Users</h2>
              <p>Roles, accesos y gestion de usuarios activos.</p>
              <span className="card-cta">Administrar usuarios</span>
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
