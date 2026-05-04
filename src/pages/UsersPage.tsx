import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import Swal from 'sweetalert2'
import AdminLayout from '../components/AdminLayout.tsx'
import { usersApi } from '../api/usersApi.ts'
import { getProfileRequest } from '../auth/authApi.ts'
import { getSession, setSessionRole } from '../auth/session.ts'
import type { User, UserPayload, UserRole } from '../types/users.ts'

const emptyUser: UserPayload = {
  name: '',
  email: '',
  role: 'receptionist',
  password: '',
  isActive: true,
}

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  technician: 'Tecnico',
  receptionist: 'Recepcion',
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [query, setQuery] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [formState, setFormState] = useState<UserPayload>(emptyUser)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [hasAdminAccess, setHasAdminAccess] = useState<boolean | null>(null)
  const isEditing = Boolean(selectedUser)
  const [isSaving, setIsSaving] = useState(false)

  const resolveUserId = (user: User) => user.id ?? user._id ?? ''

  const normalizePayload = useCallback(
    (state: UserPayload) => ({
      name: state.name.trim(),
      email: state.email.trim(),
      role: state.role ?? 'receptionist',
      isActive: state.isActive ?? true,
      password: state.password?.trim() || undefined,
    }),
    [],
  )

  const initialPayload = useMemo(() => {
    if (!selectedUser) {
      return null
    }
    return {
      name: selectedUser.name,
      email: selectedUser.email,
      role: selectedUser.role ?? 'receptionist',
      isActive: selectedUser.isActive ?? true,
      password: undefined,
    }
  }, [selectedUser])

  const isDirty = useMemo(() => {
    if (!selectedUser || !initialPayload) {
      return false
    }
    const current = normalizePayload(formState)
    return JSON.stringify({ ...current, password: undefined }) !== JSON.stringify(initialPayload)
  }, [selectedUser, initialPayload, formState, normalizePayload])

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return users
    }
    return users.filter((user) => {
      return (
        user.name.toLowerCase().includes(normalized) ||
        user.email.toLowerCase().includes(normalized) ||
        (user.role ?? '').toLowerCase().includes(normalized)
      )
    })
  }, [users, query])

  const loadUsers = useCallback(async () => {
    setStatus('loading')
    setErrorMessage('')
    try {
      const data = await usersApi.list()
      setUsers(data)
      setStatus('idle')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible cargar los usuarios.'
      if (message.toLowerCase().includes('solo admin')) {
        setHasAdminAccess(false)
        setErrorMessage('Tu cuenta no tiene permisos de administrador.')
      } else {
        setErrorMessage(message)
      }
      setStatus('error')
    }
  }, [])

  const openCreatePanel = () => {
    setSelectedUser(null)
    setFormState(emptyUser)
    setPanelOpen(true)
  }

  const openEditPanel = (user: User) => {
    setSelectedUser(user)
    setFormState({
      name: user.name,
      email: user.email,
      role: user.role ?? 'receptionist',
      isActive: user.isActive ?? true,
      password: '',
    })
    setPanelOpen(true)
  }

  const closePanel = useCallback(() => {
    setPanelOpen(false)
    setSelectedUser(null)
    setFormState(emptyUser)
  }, [])

  useEffect(() => {
    if (!panelOpen) {
      return
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePanel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [panelOpen, closePanel])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    const payload: UserPayload = normalizePayload(formState)

    try {
      if (selectedUser) {
        const userId = resolveUserId(selectedUser)
        if (!userId) {
          throw new Error('No fue posible identificar el usuario seleccionado.')
        }
        if (!payload.password) {
          delete payload.password
        }
        const updated = await usersApi.update(userId, payload)
        setUsers((prev) =>
          prev.map((item) => (resolveUserId(item) === resolveUserId(updated) ? updated : item)),
        )
        await Swal.fire({
          icon: 'success',
          title: 'Usuario actualizado',
          text: 'Los datos fueron guardados correctamente.',
          confirmButtonColor: '#2c5f7c',
        })
      } else {
        if (!payload.password) {
          throw new Error('La contrasena es obligatoria para crear usuarios.')
        }
        const created = await usersApi.create(payload as UserPayload & { password: string })
        setUsers((prev) => [created, ...prev])
        await Swal.fire({
          icon: 'success',
          title: 'Usuario creado',
          text: 'El nuevo usuario fue registrado.',
          confirmButtonColor: '#2c5f7c',
        })
      }
      closePanel()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible guardar el usuario.'
      void Swal.fire({
        icon: 'error',
        title: 'Operacion fallida',
        text: message,
        confirmButtonColor: '#2c5f7c',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (user: User) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Desactivar usuario',
      text: `Se desactivara a ${user.name}.`,
      showCancelButton: true,
      confirmButtonText: 'Si, desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e67e22',
      cancelButtonColor: '#7f8c8d',
    })

    if (!result.isConfirmed) {
      return
    }

    const userId = resolveUserId(user)
    if (!userId) {
      void Swal.fire({
        icon: 'error',
        title: 'Operacion fallida',
        text: 'No fue posible identificar el usuario.',
        confirmButtonColor: '#2c5f7c',
      })
      return
    }

    try {
      await usersApi.remove(userId)
      setUsers((prev) => prev.filter((item) => resolveUserId(item) !== userId))
      void Swal.fire({
        icon: 'success',
        title: 'Usuario desactivado',
        text: 'El usuario ya no aparece en la lista activa.',
        confirmButtonColor: '#2c5f7c',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible desactivar el usuario.'
      void Swal.fire({
        icon: 'error',
        title: 'Operacion fallida',
        text: message,
        confirmButtonColor: '#2c5f7c',
      })
    }
  }

  useEffect(() => {
    let cancelled = false

    const initializeUsers = async () => {
      const session = getSession()

      if (!session?.token) {
        if (cancelled) {
          return
        }
        setHasAdminAccess(false)
        setStatus('error')
        setErrorMessage('No hay sesion activa para validar permisos.')
        return
      }

      let isAdmin = session.role === 'admin'

      if (!session.role) {
        try {
          const profile = await getProfileRequest(session.token)
          setSessionRole(profile.role)
          isAdmin = profile.role === 'admin'
        } catch (error) {
          if (cancelled) {
            return
          }
          const message =
            error instanceof Error ? error.message : 'No fue posible validar permisos de usuario.'
          setHasAdminAccess(false)
          setStatus('error')
          setErrorMessage(message)
          return
        }
      }

      if (cancelled) {
        return
      }

      setHasAdminAccess(isAdmin)
      if (!isAdmin) {
        setStatus('error')
        setErrorMessage('Tu cuenta no tiene permisos de administrador.')
        return
      }

      try {
        const data = await usersApi.list()
        if (cancelled) {
          return
        }
        setUsers(data)
        setStatus('idle')
      } catch (error) {
        if (cancelled) {
          return
        }
        const message = error instanceof Error ? error.message : 'No fue posible cargar los usuarios.'
        if (message.toLowerCase().includes('solo admin')) {
          setHasAdminAccess(false)
          setErrorMessage('Tu cuenta no tiene permisos de administrador.')
        } else {
          setErrorMessage(message)
        }
        setStatus('error')
      }
    }

    void initializeUsers()

    return () => {
      cancelled = true
    }
  }, [])


  return (
    <AdminLayout
      title="Usuarios"
      subtitle="Gestiona accesos y roles del equipo administrativo."
      actionLabel="Nuevo usuario"
      onAction={openCreatePanel}
    >
      <div className="admin-toolbar">
        <label className="search-field">
          <span>Buscar</span>
          <input
            type="search"
            placeholder="Nombre, email o rol"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button className="btn btn-ghost" type="button" onClick={loadUsers}>
          Actualizar lista
        </button>
      </div>

      {hasAdminAccess === false && (
        <div className="state-card state-error">
          <p>Tu cuenta no tiene permisos de administrador.</p>
        </div>
      )}

      {hasAdminAccess !== false && status === 'loading' && (
        <div className="state-card">
          <p>Cargando usuarios...</p>
        </div>
      )}

      {hasAdminAccess !== false && status === 'error' && (
        <div className="state-card state-error">
          <p>{errorMessage}</p>
          <button className="btn btn-secondary" type="button" onClick={loadUsers}>
            Reintentar
          </button>
        </div>
      )}

      {hasAdminAccess !== false && status === 'idle' && filteredUsers.length === 0 && (
        <div className="state-card">
          <p>No hay usuarios registrados.</p>
          <button className="btn btn-secondary" type="button" onClick={openCreatePanel}>
            Crear primer usuario
          </button>
        </div>
      )}

      {hasAdminAccess !== false && status === 'idle' && filteredUsers.length > 0 && (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={resolveUserId(user) || user.email}>
                  <td>
                    <div className="cell-title">{user.name}</div>
                    <span className="cell-subtitle">{user.email}</span>
                  </td>
                  <td>
                    <span className="badge">{roleLabels[user.role ?? 'receptionist']}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${user.isActive ? 'is-active' : 'is-inactive'}`}>
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="btn btn-ghost btn-small"
                        type="button"
                        onClick={() => openEditPanel(user)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-secondary btn-small"
                        type="button"
                        onClick={() => handleDelete(user)}
                      >
                        Desactivar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {panelOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={closePanel}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{selectedUser ? 'Editar usuario' : 'Nuevo usuario'}</h2>
                <p>Completa la informacion requerida para guardar.</p>
              </div>
              <button className="btn btn-ghost" type="button" onClick={closePanel}>
                Cerrar
              </button>
            </div>
            <form className="form-grid" onSubmit={handleSubmit}>
              <label className="field">
                <span>Nombre completo</span>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={formState.email}
                  onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                  required
                />
              </label>
              <label className="field">
                <span>Rol</span>
                <select
                  value={formState.role ?? 'receptionist'}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, role: event.target.value as UserRole }))
                  }
                >
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{selectedUser ? 'Nueva contrasena' : 'Contrasena'}</span>
                <input
                  type="password"
                  value={formState.password ?? ''}
                  onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder={selectedUser ? 'Opcional' : 'Minimo 6 caracteres'}
                />
              </label>
              <label className="field">
                <span>Estado</span>
                <div className="toggle-group">
                  <button
                    className={`toggle-option ${formState.isActive ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => setFormState((prev) => ({ ...prev, isActive: true }))}
                  >
                    Activo
                  </button>
                  <button
                    className={`toggle-option ${!formState.isActive ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => setFormState((prev) => ({ ...prev, isActive: false }))}
                  >
                    Inactivo
                  </button>
                </div>
              </label>
              <div className="form-actions field-full">
                <button
                  className="btn btn-primary"
                  type="submit"
                  aria-disabled={isEditing && !isDirty}
                  disabled={isSaving}
                  onClick={(event) => {
                    if (isEditing && !isDirty) {
                      event.preventDefault()
                      void Swal.fire({
                        toast: true,
                        position: 'center',
                        icon: 'info',
                        title: 'No hay cambios para guardar.',
                        showConfirmButton: false,
                        timer: 2000,
                        timerProgressBar: true,
                      })
                    }
                  }}
                >
                  {isSaving && <span className="btn-spinner" aria-hidden="true" />}
                  {isSaving
                    ? 'Guardando...'
                    : selectedUser
                      ? 'Guardar cambios'
                      : 'Crear usuario'}
                </button>
                <button className="btn btn-ghost" type="button" onClick={closePanel}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
