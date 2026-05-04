import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import Swal from 'sweetalert2'
import AdminLayout from '../components/AdminLayout.tsx'
import { customersApi } from '../api/customersApi.ts'
import type { Customer, CustomerPayload } from '../types/customers.ts'

const emptyCustomer: CustomerPayload = {
  name: '',
  email: '',
  phone: '',
  address: '',
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [query, setQuery] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [formState, setFormState] = useState<CustomerPayload>(emptyCustomer)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const isEditing = Boolean(selectedCustomer)
  const [isSaving, setIsSaving] = useState(false)

  const resolveCustomerId = (customer: Customer) => customer.id ?? customer._id ?? ''

  const normalizePayload = useCallback(
    (state: CustomerPayload) => ({
      name: state.name.trim(),
      email: state.email.trim(),
      phone: state.phone?.trim() || undefined,
      address: state.address?.trim() || undefined,
    }),
    [],
  )

  const initialPayload = useMemo(() => {
    if (!selectedCustomer) {
      return null
    }
    return {
      name: selectedCustomer.name,
      email: selectedCustomer.email,
      phone: selectedCustomer.phone ?? undefined,
      address: selectedCustomer.address ?? undefined,
    }
  }, [selectedCustomer])

  const isDirty = useMemo(() => {
    if (!selectedCustomer || !initialPayload) {
      return false
    }
    const current = normalizePayload(formState)
    return JSON.stringify(current) !== JSON.stringify(initialPayload)
  }, [selectedCustomer, initialPayload, formState, normalizePayload])

  const filteredCustomers = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return customers
    }
    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(normalized) ||
        customer.email.toLowerCase().includes(normalized) ||
        (customer.phone ?? '').toLowerCase().includes(normalized)
      )
    })
  }, [customers, query])

  const loadCustomers = useCallback(async () => {
    setStatus('loading')
    setErrorMessage('')
    try {
      const data = await customersApi.list()
      setCustomers(data)
      setStatus('idle')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible cargar los clientes.'
      setErrorMessage(message)
      setStatus('error')
    }
  }, [])

  const openCreatePanel = () => {
    setSelectedCustomer(null)
    setFormState(emptyCustomer)
    setPanelOpen(true)
  }

  const openEditPanel = (customer: Customer) => {
    setSelectedCustomer(customer)
    setFormState({
      name: customer.name,
      email: customer.email,
      phone: customer.phone ?? '',
      address: customer.address ?? '',
    })
    setPanelOpen(true)
  }

  const closePanel = useCallback(() => {
    setPanelOpen(false)
    setSelectedCustomer(null)
    setFormState(emptyCustomer)
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
    const payload: CustomerPayload = normalizePayload(formState)

    try {
      if (selectedCustomer) {
        const customerId = resolveCustomerId(selectedCustomer)
        if (!customerId) {
          throw new Error('No fue posible identificar al cliente seleccionado.')
        }
        const updated = await customersApi.update(customerId, payload)
        setCustomers((prev) =>
          prev.map((item) => (resolveCustomerId(item) === resolveCustomerId(updated) ? updated : item)),
        )
        await Swal.fire({
          icon: 'success',
          title: 'Cliente actualizado',
          text: 'Los datos fueron guardados correctamente.',
          confirmButtonColor: '#2c5f7c',
        })
      } else {
        const created = await customersApi.create(payload)
        setCustomers((prev) => [created, ...prev])
        await Swal.fire({
          icon: 'success',
          title: 'Cliente creado',
          text: 'El nuevo cliente fue registrado.',
          confirmButtonColor: '#2c5f7c',
        })
      }
      closePanel()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible guardar el cliente.'
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

  const handleDelete = async (customer: Customer) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Desactivar cliente',
      text: `Se desactivara a ${customer.name}.`,
      showCancelButton: true,
      confirmButtonText: 'Si, desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e67e22',
      cancelButtonColor: '#7f8c8d',
    })

    if (!result.isConfirmed) {
      return
    }

    const customerId = resolveCustomerId(customer)
    if (!customerId) {
      void Swal.fire({
        icon: 'error',
        title: 'Operacion fallida',
        text: 'No fue posible identificar al cliente.',
        confirmButtonColor: '#2c5f7c',
      })
      return
    }

    try {
      await customersApi.remove(customerId)
      setCustomers((prev) => prev.filter((item) => resolveCustomerId(item) !== customerId))
      void Swal.fire({
        icon: 'success',
        title: 'Cliente desactivado',
        text: 'El cliente ya no aparece en la lista activa.',
        confirmButtonColor: '#2c5f7c',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible desactivar el cliente.'
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

    const loadInitialCustomers = async () => {
      try {
        const data = await customersApi.list()
        if (cancelled) {
          return
        }
        setCustomers(data)
        setStatus('idle')
      } catch (error) {
        if (cancelled) {
          return
        }
        const message =
          error instanceof Error ? error.message : 'No fue posible cargar los clientes.'
        setErrorMessage(message)
        setStatus('error')
      }
    }

    void loadInitialCustomers()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <AdminLayout
      title="Clientes"
      subtitle="Registra y mantiene actualizada la informacion de tus clientes."
      actionLabel="Nuevo cliente"
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
        <button className="btn btn-ghost" type="button" onClick={loadCustomers}>
          Actualizar lista
        </button>
      </div>

      {status === 'loading' && (
        <div className="state-card">
          <p>Cargando clientes...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="state-card state-error">
          <p>{errorMessage}</p>
          <button className="btn btn-secondary" type="button" onClick={loadCustomers}>
            Reintentar
          </button>
        </div>
      )}

      {status === 'idle' && filteredCustomers.length === 0 && (
        <div className="state-card">
          <p>No hay clientes activos registrados.</p>
          <button className="btn btn-secondary" type="button" onClick={openCreatePanel}>
            Crear primer cliente
          </button>
        </div>
      )}

      {status === 'idle' && filteredCustomers.length > 0 && (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contacto</th>
                <th>Direccion</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={resolveCustomerId(customer) || customer.email}>
                  <td>
                    <div className="cell-title">{customer.name}</div>
                    <span className="cell-subtitle">{customer.email}</span>
                  </td>
                  <td>{customer.phone || 'Sin telefono'}</td>
                  <td>{customer.address || 'Sin direccion'}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="btn btn-ghost btn-small"
                        type="button"
                        onClick={() => openEditPanel(customer)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-secondary btn-small"
                        type="button"
                        onClick={() => handleDelete(customer)}
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
                <h2>{selectedCustomer ? 'Editar cliente' : 'Nuevo cliente'}</h2>
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
                <span>Direccion</span>
                <input
                  type="text"
                  value={formState.address ?? ''}
                  onChange={(event) => setFormState((prev) => ({ ...prev, address: event.target.value }))}
                />
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
                    : selectedCustomer
                      ? 'Guardar cambios'
                      : 'Crear cliente'}
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
