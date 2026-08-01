import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import Swal from 'sweetalert2'
import { customersApi } from '../../api/customersApi.ts'
import type { Customer, CustomerPayload } from '../../types/customers.ts'
import { normalizeChileanRut } from '../../utils/chileanRut.ts'
import {
  normalizeChileanMobile,
  normalizeCustomerEmail,
  normalizeCustomerName,
} from '../../utils/customerValidation.ts'

/**
 * Estructura vacía por defecto para inicializar el formulario de clientes.
 */
export const emptyCustomer: CustomerPayload = {
  name: '',
  email: '',
  rut: '',
  phone: '',
  address: '',
}

/**
 * Custom hook de lógica de negocio y gestión de estado para el panel administrativo de Clientes.
 * 
 * Centraliza todo el ciclo de vida y control de datos para la página de Clientes:
 * - Carga inicial de datos de la API.
 * - Filtros de búsqueda locales sobre la lista.
 * - Flujo del modal overlay (abrir, cerrar, rellenar datos en modo edición).
 * - Envío y guardado (creación/edición) controlando estados de guardado e inactividad.
 * - Desactivación segura de clientes a través de cuadros de diálogo interactivos.
 * 
 * @returns Un objeto estructurado con estados, callbacks de eventos y métodos de control.
 */
export function useCustomers(canChangeStatus = false) {
  /** Lista de clientes visibles para el rol actual obtenidos de la API. */
  const [customers, setCustomers] = useState<Customer[]>([])
  /** Estado actual de la carga de datos (`idle`, `loading`, `error`). */
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading')
  /** Mensaje de error a desplegar en la interfaz en caso de fallas de red. */
  const [errorMessage, setErrorMessage] = useState('')
  /** Cadena de búsqueda ingresada por el usuario. */
  const [query, setQuery] = useState('')
  /** Controla la visibilidad del modal de creación/edición. */
  const [panelOpen, setPanelOpen] = useState(false)
  /** Contenido actual del formulario de entrada. */
  const [formState, setFormState] = useState<CustomerPayload>(emptyCustomer)
  /** Registro del cliente seleccionado cuando se abre el modal en modo edición; `null` si es creación. */
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  /** Bandera reactiva derivada que indica si el formulario está en modo de edición. */
  const isEditing = Boolean(selectedCustomer)
  /** Bandera que indica si hay una petición asíncrona de persistencia en proceso. */
  const [isSaving, setIsSaving] = useState(false)

  /**
   * Resuelve de manera uniforme y segura el identificador único del cliente
   * soportando esquemas mixtos (`id` vs `_id`).
   */
  const resolveCustomerId = useCallback((customer: Customer) => customer.id ?? customer._id ?? '', [])

  /**
   * Normaliza los campos del payload de clientes limpiando espacios vacíos redundantes.
   */
  const normalizePayload = useCallback(
    (state: CustomerPayload) => ({
      name: normalizeCustomerName(state.name),
      email: normalizeCustomerEmail(state.email),
      rut: state.rut?.trim() ? normalizeChileanRut(state.rut) : undefined,
      phone: state.phone?.trim() ? normalizeChileanMobile(state.phone) : undefined,
      address: state.address?.trim() || undefined,
      ...(canChangeStatus && state.isActive !== undefined
        ? { isActive: state.isActive }
        : {}),
    }),
    [canChangeStatus],
  )

  /**
   * Genera el payload de datos inicial del cliente que está seleccionado para comparar modificaciones.
   */
  const initialPayload = useMemo(() => {
    if (!selectedCustomer) {
      return null
    }
    return {
      name: normalizeCustomerName(selectedCustomer.name),
      email: normalizeCustomerEmail(selectedCustomer.email),
      rut: selectedCustomer.rut
        ? normalizeChileanRut(selectedCustomer.rut)
        : undefined,
      phone: selectedCustomer.phone
        ? normalizeChileanMobile(selectedCustomer.phone)
        : undefined,
      address: selectedCustomer.address ?? undefined,
      ...(canChangeStatus
        ? { isActive: selectedCustomer.isActive !== false }
        : {}),
    }
  }, [canChangeStatus, selectedCustomer])

  /**
   * Compara los datos actuales del formulario con los originales del registro.
   * Devuelve `true` si el usuario ha realizado modificaciones (estado sucio), de lo contrario `false`.
   */
  const isDirty = useMemo(() => {
    if (!selectedCustomer || !initialPayload) {
      return false
    }
    const current = normalizePayload(formState)
    return JSON.stringify(current) !== JSON.stringify(initialPayload)
  }, [selectedCustomer, initialPayload, formState, normalizePayload])

  /**
   * Lista de clientes filtrada reactivamente basada en la búsqueda del usuario.
   * Filtra por nombre, email o teléfono ignorando mayúsculas y espacios innecesarios.
   */
  const filteredCustomers = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return customers
    }
    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(normalized) ||
        customer.email.toLowerCase().includes(normalized) ||
        (customer.rut ?? '').toLowerCase().includes(normalized) ||
        (customer.phone ?? '').toLowerCase().includes(normalized)
      )
    })
  }, [customers, query])

  /**
   * Realiza la llamada asíncrona a la API para cargar o refrescar el listado de clientes.
   */
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

  /**
   * Abre el modal overlay inicializado en modo de Creación de nuevo cliente.
   */
  const openCreatePanel = useCallback(() => {
    setSelectedCustomer(null)
    setFormState(emptyCustomer)
    setPanelOpen(true)
  }, [])

  /**
   * Abre el modal overlay inicializado con los datos de un cliente existente en modo de Edición.
   * @param customer Datos del cliente a editar.
   */
  const openEditPanel = useCallback((customer: Customer) => {
    setSelectedCustomer(customer)
    setFormState({
      name: customer.name,
      email: customer.email,
      rut: customer.rut ?? '',
      phone: customer.phone ?? '',
      address: customer.address ?? '',
      ...(canChangeStatus ? { isActive: customer.isActive !== false } : {}),
    })
    setPanelOpen(true)
  }, [canChangeStatus])

  /**
   * Cierra el modal y restablece todos los valores del formulario a su estado vacío por defecto.
   */
  const closePanel = useCallback(() => {
    setPanelOpen(false)
    setSelectedCustomer(null)
    setFormState(emptyCustomer)
  }, [])

  /**
   * Procesa la llamada asíncrona de envío del formulario.
   * Determina si se ejecuta una llamada de Creación o de Edición en base al estado actual,
   * actualiza de forma reactiva la lista en memoria y despliega alertas interactivas de éxito o fallo.
   * 
   * @param event Evento nativo del envío del formulario.
   */
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

  const handlePermanentDelete = async (customer: Customer) => {
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

    const result = await Swal.fire({
      icon: 'error',
      title: 'Eliminar cliente definitivamente',
      text: `Se eliminara definitivamente a ${customer.name}. Solo sera posible si no tiene ordenes asociadas. Esta accion no se puede deshacer.`,
      showCancelButton: true,
      confirmButtonText: 'Si, eliminar definitivamente',
      cancelButtonText: 'Conservar cliente',
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#7f8c8d',
      focusCancel: true,
    })

    if (!result.isConfirmed) {
      return
    }

    try {
      await customersApi.deletePermanent(customerId)
      setCustomers((prev) =>
        prev.filter((item) => resolveCustomerId(item) !== customerId),
      )
      void Swal.fire({
        icon: 'success',
        title: 'Cliente eliminado',
        text: 'El cliente fue eliminado definitivamente y la accion quedo registrada.',
        confirmButtonColor: '#2c5f7c',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible eliminar al cliente.'
      void Swal.fire({
        icon: 'error',
        title: 'Operacion fallida',
        text: message,
        confirmButtonColor: '#2c5f7c',
      })
    }
  }

  // Carga inicial automatizada de clientes al montar el hook
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

  return {
    status,
    errorMessage,
    query,
    setQuery,
    panelOpen,
    formState,
    setFormState,
    selectedCustomer,
    isSaving,
    isEditing,
    isDirty,
    filteredCustomers,
    resolveCustomerId,
    loadCustomers,
    openCreatePanel,
    openEditPanel,
    closePanel,
    handleSubmit,
    handlePermanentDelete,
  }
}
