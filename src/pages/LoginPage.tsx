import { useState, type ComponentProps } from 'react'
import Swal from 'sweetalert2'
import { Link, useNavigate } from 'react-router-dom'
import { getProfileRequest, loginRequest } from '../auth/authApi.ts'
import { saveSession, setSessionRole } from '../auth/session.ts'

type LoginErrors = {
  email?: string
  password?: string
}

function validate(email: string, password: string): LoginErrors {
  const errors: LoginErrors = {}
  const normalizedEmail = email.trim()

  if (!normalizedEmail) {
    errors.email = 'El email es obligatorio.'
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      errors.email = 'Ingresa un email valido.'
    }
  }

  if (!password) {
    errors.password = 'La contrasena es obligatoria.'
  } else if (password.length < 6) {
    errors.password = 'La contrasena debe tener minimo 6 caracteres.'
  }

  return errors
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<LoginErrors>({})
  const [apiError, setApiError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit: ComponentProps<'form'>['onSubmit'] = async (event) => {
    event.preventDefault()
    setApiError('')

    const formErrors = validate(email, password)
    setErrors(formErrors)
    if (Object.keys(formErrors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      const token = await loginRequest({
        email: email.trim(),
        password,
      })

      saveSession(token, email.trim())
      try {
        const profile = await getProfileRequest(token)
        setSessionRole(profile.role)
      } catch {
        setSessionRole(undefined)
      }
      await Swal.fire({
        icon: 'success',
        title: 'Sesion iniciada',
        text: 'Acceso correcto. Seras redirigido al dashboard.',
        confirmButtonText: 'Continuar',
        confirmButtonColor: '#2456f5',
      })
      navigate('/dashboard', { replace: true })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error inesperado al iniciar sesion.'
      setApiError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <Link to="/" className="brand">
            Servicio Tecnico
          </Link>
          <nav className="topbar-actions">
            <Link to="/" className="btn btn-ghost">
              Home
            </Link>
          </nav>
        </div>
      </header>

      <main className="container main-content auth-main">
        <section className="panel auth-card">
          <h1>Iniciar sesion</h1>
          <p>Accede con tu cuenta para ingresar al dashboard.</p>

          <form className="form-grid" onSubmit={handleSubmit} noValidate>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
              />
              {errors.email && <small className="field-error">{errors.email}</small>}
            </label>

            <label className="field">
              <span>Contrasena</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="******"
              />
              {errors.password && (
                <small className="field-error">{errors.password}</small>
              )}
            </label>

            {apiError && <p className="api-error">{apiError}</p>}

            <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
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
