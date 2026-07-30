import { Link } from 'react-router-dom'
import { getSession } from '../auth/session.ts'
import { useLogout } from '../auth/useLogout.ts'
import { hasCapability } from '../auth/capabilities.ts'
import AppFooter from '../components/AppFooter.tsx'

export default function DashboardPage() {
  const session = getSession()
  const role = session?.role
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
              <p>Accesos disponibles segun tu rol.</p>
            </div>
          </div>

          <div className="dashboard-grid">
            {hasCapability(role, 'view_customers') && <Link to="/customers" className="dashboard-card">
              <span className="card-label">Clientes</span>
              <h2>Customers</h2>
              <p>Gestiona datos, contacto y estado de clientes.</p>
              <span className="card-cta">Administrar clientes</span>
            </Link>}
            {hasCapability(role, 'view_technicians') && <Link to="/technicians" className="dashboard-card">
              <span className="card-label">Tecnicos</span>
              <h2>Technicians</h2>
              <p>Controla especialidades, contacto y disponibilidad.</p>
              <span className="card-cta">{hasCapability(role, 'manage_technicians') ? 'Administrar tecnicos' : 'Consultar tecnicos'}</span>
            </Link>}
            {hasCapability(role, 'view_products') && <Link to="/products" className="dashboard-card">
              <span className="card-label">Productos</span>
              <h2>Productos (incluye servicios)</h2>
              <p>Catalogo, precios e inventario de repuestos y servicios.</p>
              <span className="card-cta">{hasCapability(role, 'manage_products') ? 'Administrar productos' : 'Consultar productos'}</span>
            </Link>}
            {hasCapability(role, 'view_orders') && <Link to="/service-orders" className="dashboard-card">
              <span className="card-label">Ordenes</span>
              <h2>Ordenes de servicio</h2>
              <p>Seguimiento de estado, prioridad y atencion de cada solicitud.</p>
              <span className="card-cta">{role === 'technician' ? 'Ver mis ordenes' : 'Administrar ordenes'}</span>
            </Link>}
            {hasCapability(role, 'manage_users') && <Link to="/users" className="dashboard-card">
              <span className="card-label">Usuarios</span>
              <h2>Users</h2>
              <p>Roles, accesos y gestion de usuarios activos.</p>
              <span className="card-cta">Administrar usuarios</span>
            </Link>}
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  )
}
