import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import Swal from 'sweetalert2'
import AdminLayout from '../components/AdminLayout.tsx'
import { techniciansApi } from '../api/techniciansApi.ts'
import type { Technician, TechnicianPayload, TechnicianSpecialty } from '../types/technicians.ts'

const emptyTechnician: TechnicianPayload = {
  name: '',
  email: '',
  phone: '',
  specialty: 'general',
}

const specialtyLabels: Record<TechnicianSpecialty, string> = {
  electronics: 'Electronica',
  computing: 'Computacion',
  appliances: 'Electrodomesticos',
  general: 'General',
}

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [query, setQuery] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [formState, setFormState] = useState<TechnicianPayload>(emptyTechnician)
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null)
  const isEditing = Boolean(selectedTechnician)
  const [isSaving, setIsSaving] = useState(false)

  const resolveTechnicianId = (technician: Technician) => technician.id ?? technician._id ?? ''

  const normalizePayload = useCallback(
    (state: TechnicianPayload) => ({
      name: state.name.trim(),
      email: state.email.trim(),
      phone: state.phone?.trim() || undefined,
      specialty: state.specialty ?? 'general',
    }),
    [],
  )

  const initialPayload = useMemo(() => {
    if (!selectedTechnician) {
      return null
    }
    return {
      name: selectedTechnician.name,
      email: selectedTechnician.email,
      phone: selectedTechnician.phone ?? undefined,
      specialty: selectedTechnician.specialty ?? 'general',
    }
  }, [selectedTechnician])

  const isDirty = useMemo(() => {
    if (!selectedTechnician || !initialPayload) {
      return false
    }
    const current = normalizePayload(formState)
    return JSON.stringify(current) !== JSON.stringify(initialPayload)
  }, [selectedTechnician, initialPayload, formState, normalizePayload])

  const filteredTechnicians = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return technicians
    }
    return technicians.filter((technician) => {
      return (
        technician.name.toLowerCase().includes(normalized) ||
        technician.email.toLowerCase().includes(normalized) ||
        (technician.phone ?? '').toLowerCase().includes(normalized)
      )
    })
  }, [technicians, query])

  const loadTechnicians = useCallback(async () => {
    setStatus('loading')
    setErrorMessage('')
    try {
      const data = await techniciansApi.list()
      setTechnicians(data)
      setStatus('idle')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible cargar los tecnicos.'
      setErrorMessage(message)
      setStatus('error')
    }
  }, [])

  const openCreatePanel = () => {
    setSelectedTechnician(null)
    setFormState(emptyTechnician)
    setPanelOpen(true)
  }

  const openEditPanel = (technician: Technician) => {
    setSelectedTechnician(technician)
    setFormState({
      name: technician.name,
      email: technician.email,
      phone: technician.phone ?? '',
      specialty: technician.specialty ?? 'general',
    })
    setPanelOpen(true)
  }

  const closePanel = useCallback(() => {
    setPanelOpen(false)
    setSelectedTechnician(null)
    setFormState(emptyTechnician)
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
    const payload: TechnicianPayload = normalizePayload(formState)

    try {
      if (selectedTechnician) {
        const technicianId = resolveTechnicianId(selectedTechnician)
        if (!technicianId) {
          throw new Error('No fue posible identificar al tecnico seleccionado.')
        }
        const updated = await techniciansApi.update(technicianId, payload)
        setTechnicians((prev) =>
          prev.map((item) => (resolveTechnicianId(item) === resolveTechnicianId(updated) ? updated : item)),
        )
        await Swal.fire({
          icon: 'success',
          title: 'Tecnico actualizado',
          text: 'Los datos fueron guardados correctamente.',
          confirmButtonColor: '#2c5f7c',
        })
      } else {
        const created = await techniciansApi.create(payload)
        setTechnicians((prev) => [created, ...prev])
        await Swal.fire({
          icon: 'success',
          title: 'Tecnico creado',
          text: 'El nuevo tecnico fue registrado.',
          confirmButtonColor: '#2c5f7c',
        })
      }
      closePanel()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible guardar el tecnico.'
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

  const handleDelete = async (technician: Technician) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Desactivar tecnico',
      text: `Se desactivara a ${technician.name}.`,
      showCancelButton: true,
      confirmButtonText: 'Si, desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e67e22',
      cancelButtonColor: '#7f8c8d',
    })

    if (!result.isConfirmed) {
      return
    }

    const technicianId = resolveTechnicianId(technician)
    if (!technicianId) {
      void Swal.fire({
        icon: 'error',
        title: 'Operacion fallida',
        text: 'No fue posible identificar al tecnico.',
        confirmButtonColor: '#2c5f7c',
      })
      return
    }

    try {
      await techniciansApi.remove(technicianId)
      setTechnicians((prev) => prev.filter((item) => resolveTechnicianId(item) !== technicianId))
      void Swal.fire({
        icon: 'success',
        title: 'Tecnico desactivado',
        text: 'El tecnico ya no aparece en la lista activa.',
        confirmButtonColor: '#2c5f7c',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible desactivar el tecnico.'
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

    const loadInitialTechnicians = async () => {
      try {
        const data = await techniciansApi.list()
        if (cancelled) {
          return
        }
        setTechnicians(data)
        setStatus('idle')
      } catch (error) {
        if (cancelled) {
          return
        }
        const message = error instanceof Error ? error.message : 'No fue posible cargar los tecnicos.'
        setErrorMessage(message)
        setStatus('error')
      }
    }

    void loadInitialTechnicians()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <AdminLayout
      title="Tecnicos"
      subtitle="Administra el equipo tecnico y sus especialidades activas."
      actionLabel="Nuevo tecnico"
      onAction={openCreatePanel}
    >
      <div className="admin-toolbar">
        <label className="search-field">
          <span>Buscar</span>
          <input
            type="search"
            placeholder="Nombre, email o telefono"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button className="btn btn-ghost" type="button" onClick={loadTechnicians}>
          Actualizar lista
        </button>
      </div>

      {status === 'loading' && (
        <div className="state-card">
          <p>Cargando tecnicos...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="state-card state-error">
          <p>{errorMessage}</p>
          <button className="btn btn-secondary" type="button" onClick={loadTechnicians}>
            Reintentar
          </button>
        </div>
      )}

      {status === 'idle' && filteredTechnicians.length === 0 && (
        <div className="state-card">
          <p>No hay tecnicos activos registrados.</p>
          <button className="btn btn-secondary" type="button" onClick={openCreatePanel}>
            Crear primer tecnico
          </button>
        </div>
      )}

      {status === 'idle' && filteredTechnicians.length > 0 && (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Tecnico</th>
                <th>Contacto</th>
                <th>Especialidad</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredTechnicians.map((technician) => (
                <tr key={resolveTechnicianId(technician) || technician.email}>
                  <td>
                    <div className="cell-title">{technician.name}</div>
                    <span className="cell-subtitle">{technician.email}</span>
                  </td>
                  <td>{technician.phone || 'Sin telefono'}</td>
                  <td>
                    <span className="badge">{specialtyLabels[technician.specialty ?? 'general']}</span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="btn btn-ghost btn-small"
                        type="button"
                        onClick={() => openEditPanel(technician)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-secondary btn-small"
                        type="button"
                        onClick={() => handleDelete(technician)}
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
                <h2>{selectedTechnician ? 'Editar tecnico' : 'Nuevo tecnico'}</h2>
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
                <span>Telefono</span>
                <input
                  type="text"
                  value={formState.phone ?? ''}
                  onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Especialidad</span>
                <select
                  value={formState.specialty ?? 'general'}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, specialty: event.target.value as TechnicianSpecialty }))
                  }
                >
                  {Object.entries(specialtyLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
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
                    : selectedTechnician
                      ? 'Guardar cambios'
                      : 'Crear tecnico'}
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
