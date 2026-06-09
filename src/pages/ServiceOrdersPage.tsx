import { useCallback, useEffect, useMemo, useState, type ComponentProps } from 'react'
import Swal from 'sweetalert2'
import AdminLayout from '../components/AdminLayout.tsx'
import { customersApi } from '../api/customersApi.ts'
import { productsApi } from '../api/productsApi.ts'
import { serviceOrdersApi } from '../api/serviceOrdersApi.ts'
import { techniciansApi } from '../api/techniciansApi.ts'
import type {
  CreateServiceOrderPayload,
  ServiceOrder,
  ServiceOrderPriority,
  ServiceOrderStatus,
  UpdateServiceOrderPayload,
} from '../types/serviceOrders.ts'
import type { Customer } from '../types/customers.ts'
import type { Product } from '../types/products.ts'
import type { Technician } from '../types/technicians.ts'
import { buildDynamicOptions } from '../utils/dynamicOptions.ts'

const statusLabels: Record<ServiceOrderStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En proceso',
  waiting_parts: 'Espera repuestos',
  completed: 'Completada',
  delivered: 'Entregada',
  cancelled: 'Cancelada',
}

const priorityLabels: Record<ServiceOrderPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
}

type ServiceOrderFormState = CreateServiceOrderPayload & {
  status?: ServiceOrderStatus
  diagnosis?: string
  workDone?: string
  laborCost?: number
}

const emptyOrder: ServiceOrderFormState = {
  customerId: '',
  technicianId: '',
  deviceType: '',
  deviceBrand: '',
  deviceModel: '',
  serialNumber: '',
  problemDescription: '',
  status: 'pending',
  priority: 'medium',
  diagnosis: '',
  workDone: '',
  laborCost: undefined,
  estimatedDelivery: '',
  items: [],
}

const getTomorrowDateString = (): string => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const year = tomorrow.getFullYear()
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0')
  const day = String(tomorrow.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function ServiceOrdersPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [query, setQuery] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [formState, setFormState] = useState<ServiceOrderFormState>(emptyOrder)
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null)
  const isEditing = Boolean(selectedOrder)
  const [isSaving, setIsSaving] = useState(false)

  const isReadOnly = useMemo(() => {
    if (!selectedOrder) return false
    return ['delivered', 'cancelled'].includes(selectedOrder.status)
  }, [selectedOrder])

  const resolveOrderId = (order: ServiceOrder) => order.id ?? order._id ?? ''
  const resolveCustomerId = (customer: Customer) => customer.id ?? customer._id ?? ''
  const resolveProductId = (product: Product) => product.id ?? product._id ?? ''
  const resolveTechnicianId = (technician: Technician) => technician.id ?? technician._id ?? ''

  const customersById = useMemo(() => {
    return customers.reduce<Record<string, Customer>>((acc, customer) => {
      const id = resolveCustomerId(customer)
      if (id) {
        acc[id] = customer
      }
      return acc
    }, {})
  }, [customers])

  const techniciansById = useMemo(() => {
    return technicians.reduce<Record<string, Technician>>((acc, technician) => {
      const id = resolveTechnicianId(technician)
      if (id) {
        acc[id] = technician
      }
      return acc
    }, {})
  }, [technicians])

  const productsById = useMemo(() => {
    return products.reduce<Record<string, Product>>((acc, product) => {
      const id = resolveProductId(product)
      if (id) {
        acc[id] = product
      }
      return acc
    }, {})
  }, [products])

  const resolveCustomerName = useCallback(
    (customerId: string) => customersById[customerId]?.name || `Cliente desconocido (ID: ${customerId})`,
    [customersById],
  )

  const resolveTechnicianName = useCallback(
    (technicianId?: string) =>
      technicianId
        ? techniciansById[technicianId]?.name || `Tecnico desconocido (ID: ${technicianId})`
        : 'Sin asignar',
    [techniciansById],
  )

  const formatDate = (value?: string) => {
    if (!value) {
      return 'Sin fecha'
    }
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return value
    }
    return parsed.toLocaleDateString('es-CL')
  }

  const formatCurrency = (value: number) => `$${value.toLocaleString('es-CL')}`

  const addItemRow = async () => {
    if (products.length === 0) {
      void Swal.fire({
        icon: 'info',
        title: 'Sin productos',
        text: 'No hay productos disponibles para agregar.',
        confirmButtonColor: '#2c5f7c',
      })
      return
    }

    const options = products
      .map((product) => {
        const id = resolveProductId(product)
        const label = `${product.name} (${product.sku}) - $${product.price.toLocaleString('es-CL')}`
        return `<option value="${id}">${label}</option>`
      })
      .join('')

    const result = await Swal.fire({
      title: 'Agregar item',
      html: `
        <div class="swal-form-grid">
          <label class="swal-form-field full">
            <span>Producto</span>
            <select id="item-product" class="swal2-select">
              <option value="">Selecciona un producto</option>
              ${options}
            </select>
          </label>
          <div class="swal-form-row">
            <label class="swal-form-field">
              <span>Cantidad</span>
              <input id="item-qty" class="swal2-input" type="number" min="1" value="1">
            </label>
          </div>
        </div>
      `,
      customClass: {
        popup: 'swal-form-popup service-order-item-popup',
        title: 'swal-form-title',
        htmlContainer: 'swal-form-body service-order-item-body',
        confirmButton: 'btn btn-primary swal-form-confirm',
        cancelButton: 'btn btn-secondary swal-form-cancel',
      },
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Agregar',
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        const productSelect = document.getElementById('item-product') as HTMLSelectElement | null
        const qtyInput = document.getElementById('item-qty') as HTMLInputElement | null
        if (!productSelect || !qtyInput) {
          return
        }
        productSelect.addEventListener('change', () => {
          qtyInput.focus()
          qtyInput.select()
        })
      },
      preConfirm: () => {
        const productSelect = document.getElementById('item-product') as HTMLSelectElement | null
        const qtyInput = document.getElementById('item-qty') as HTMLInputElement | null

        const productId = productSelect?.value ?? ''
        const quantity = Number(qtyInput?.value ?? '1')

        if (!productId) {
          Swal.showValidationMessage('Selecciona un producto.')
          return null
        }
        if (!Number.isFinite(quantity) || quantity < 1) {
          Swal.showValidationMessage('La cantidad debe ser al menos 1.')
          return null
        }

        const product = productsById[productId]
        if (!product) {
          Swal.showValidationMessage('Producto no valido.')
          return null
        }

        return {
          productId,
          productName: product.name,
          quantity,
          unitPrice: product.price,
        }
      },
    })

    if (!result.isConfirmed || !result.value) {
      return
    }

    const exists = (formState.items ?? []).some((item) => item.productId === result.value.productId)
    if (exists) {
      void Swal.fire({
        icon: 'info',
        title: 'Item duplicado',
        text: 'Este producto ya fue agregado.',
        confirmButtonColor: '#2c5f7c',
      })
      return
    }

    setFormState((prev) => ({
      ...prev,
      items: [...(prev.items ?? []), result.value],
    }))
  }

  const removeItemRow = async (index: number) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Eliminar item',
      text: 'Esta accion eliminara el item de la orden.',
      showCancelButton: true,
      confirmButtonText: 'Si, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e67e22',
      cancelButtonColor: '#7f8c8d',
    })

    if (!result.isConfirmed) {
      return
    }

    setFormState((prev) => ({
      ...prev,
      items: (prev.items ?? []).filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const sanitizeItems = (items: ServiceOrderFormState['items']): ServiceOrderFormState['items'] => {
    return (items ?? []).filter((item) =>
      item.productId &&
      item.productName &&
      item.unitPrice > 0 &&
      (item.quantity ?? 1) >= 1,
    )
  }

  const normalizeUpdatePayload = useCallback(
    (state: ServiceOrderFormState) => ({
      technicianId: state.technicianId?.trim() || undefined,
      diagnosis: state.diagnosis?.trim() || undefined,
      workDone: state.workDone?.trim() || undefined,
      status: state.status ?? 'pending',
      priority: state.priority ?? 'medium',
      laborCost:
        state.laborCost !== undefined && !Number.isNaN(state.laborCost)
          ? Number(state.laborCost)
          : undefined,
      estimatedDelivery: state.estimatedDelivery?.trim() || undefined,
      items: sanitizeItems(state.items),
    }),
    [],
  )

  const initialUpdatePayload = useMemo(() => {
    if (!selectedOrder) {
      return null
    }
    return {
      technicianId: selectedOrder.technicianId ?? undefined,
      diagnosis: selectedOrder.diagnosis ?? undefined,
      workDone: selectedOrder.workDone ?? undefined,
      status: selectedOrder.status ?? 'pending',
      priority: selectedOrder.priority ?? 'medium',
      laborCost: selectedOrder.laborCost ?? undefined,
      estimatedDelivery: selectedOrder.estimatedDelivery ?? undefined,
      items: sanitizeItems(selectedOrder.items),
    }
  }, [selectedOrder])

  const isUpdateDirty = useMemo(() => {
    if (!selectedOrder || !initialUpdatePayload) {
      return false
    }
    const current = normalizeUpdatePayload(formState)
    return JSON.stringify(current) !== JSON.stringify(initialUpdatePayload)
  }, [selectedOrder, initialUpdatePayload, formState, normalizeUpdatePayload])

  const customerOptions = useMemo(
    () =>
      buildDynamicOptions({
        items: customers,
        currentId: formState.customerId,
        resolveId: resolveCustomerId,
        resolveLabel: (customer) => customer.name,
        unknownLabel: (id) => `Cliente desconocido (ID: ${id})`,
      }),
    [customers, formState.customerId],
  )

  const technicianOptions = useMemo(
    () =>
      buildDynamicOptions({
        items: technicians,
        currentId: formState.technicianId,
        resolveId: resolveTechnicianId,
        resolveLabel: (technician) => technician.name,
        unknownLabel: (id) => `Tecnico desconocido (ID: ${id})`,
      }),
    [technicians, formState.technicianId],
  )

  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return orders
    }
    return orders.filter((order) => {
      const statusLabel = statusLabels[order.status ?? 'pending'].toLowerCase()
      const priorityLabel = priorityLabels[order.priority ?? 'medium'].toLowerCase()
      const customerName = resolveCustomerName(order.customerId).toLowerCase()
      const technicianName = resolveTechnicianName(order.technicianId).toLowerCase()
      return (
        (order.orderNumber ?? '').toLowerCase().includes(normalized) ||
        order.customerId.toLowerCase().includes(normalized) ||
        customerName.includes(normalized) ||
        order.deviceType.toLowerCase().includes(normalized) ||
        order.deviceBrand.toLowerCase().includes(normalized) ||
        technicianName.includes(normalized) ||
        statusLabel.includes(normalized) ||
          priorityLabel.includes(normalized)
      )
    })
  }, [orders, query, resolveCustomerName, resolveTechnicianName])

  const itemsTotal = useMemo(() => {
    return (formState.items ?? []).reduce((sum, item) => {
      const quantity = item.quantity ?? 1
      return sum + item.unitPrice * quantity
    }, 0)
  }, [formState.items])

  const loadOrders = useCallback(async () => {
    setStatus('loading')
    setErrorMessage('')
    try {
      const [data, customersData, techniciansData, productsData] = await Promise.all([
        serviceOrdersApi.list(),
        customersApi.list(),
        techniciansApi.list(),
        productsApi.list(),
      ])
      setOrders(data)
      setCustomers(customersData)
      setTechnicians(techniciansData)
      setProducts(productsData)
      setStatus('idle')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No fue posible cargar las ordenes de servicio.'
      setErrorMessage(message)
      setStatus('error')
    }
  }, [])

  const openCreatePanel = () => {
    setSelectedOrder(null)
    setFormState({
      ...emptyOrder,
      estimatedDelivery: getTomorrowDateString(),
    })
    setPanelOpen(true)
  }

  const openEditPanel = (order: ServiceOrder) => {
    setSelectedOrder(order)
    setFormState({
      customerId: order.customerId,
      technicianId: order.technicianId ?? '',
      deviceType: order.deviceType,
      deviceBrand: order.deviceBrand,
      deviceModel: order.deviceModel ?? '',
      serialNumber: order.serialNumber ?? '',
      problemDescription: order.problemDescription,
      status: order.status ?? 'pending',
      priority: order.priority ?? 'medium',
      diagnosis: order.diagnosis ?? '',
      workDone: order.workDone ?? '',
      laborCost: order.laborCost,
      estimatedDelivery: order.estimatedDelivery ?? '',
      items: order.items ?? [],
    })
    setPanelOpen(true)
  }

  const closePanel = useCallback(() => {
    setPanelOpen(false)
    setSelectedOrder(null)
    setFormState(emptyOrder)
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

  const handleSubmit: ComponentProps<'form'>['onSubmit'] = async (event) => {
    event.preventDefault()
    setIsSaving(true)

    try {
        if (selectedOrder) {
          const newStatus = formState.status ?? 'pending'
          const oldStatus = selectedOrder.status ?? 'pending'
          const isChangingToFinalState =
            ['delivered', 'cancelled'].includes(newStatus) && newStatus !== oldStatus

          if (isChangingToFinalState) {
            const result = await Swal.fire({
              icon: 'warning',
              title: 'Confirmar cambio de estado',
              text: `Estas a punto de cambiar el estado a "${statusLabels[newStatus]}". Una vez guardado, la orden no podra ser editada. ¿Deseas continuar?`,
              showCancelButton: true,
              confirmButtonText: 'Si, continuar',
              cancelButtonText: 'Cancelar',
              confirmButtonColor: '#2c5f7c',
              cancelButtonColor: '#e67e22',
            })

            if (!result.isConfirmed) {
              setIsSaving(false)
              return
            }
          }

          const orderId = resolveOrderId(selectedOrder)
          if (!orderId) {
            await Swal.fire({
              icon: 'error',
              title: 'Operacion fallida',
              text: 'No fue posible identificar la orden seleccionada.',
              confirmButtonColor: '#2c5f7c',
            })
            return
          }

        const payload: UpdateServiceOrderPayload = normalizeUpdatePayload(formState)
        const updated = await serviceOrdersApi.update(orderId, payload)
        setOrders((prev) =>
          prev.map((item) => (resolveOrderId(item) === resolveOrderId(updated) ? updated : item)),
        )
        await Swal.fire({
          icon: 'success',
          title: 'Orden actualizada',
          text: 'Los datos fueron guardados correctamente.',
          confirmButtonColor: '#2c5f7c',
        })
      } else {
        const payload: CreateServiceOrderPayload = {
          customerId: formState.customerId.trim(),
          technicianId: formState.technicianId?.trim() || undefined,
          deviceType: formState.deviceType.trim(),
          deviceBrand: formState.deviceBrand.trim(),
          deviceModel: formState.deviceModel?.trim() || undefined,
          serialNumber: formState.serialNumber?.trim() || undefined,
          problemDescription: formState.problemDescription.trim(),
          priority: formState.priority ?? 'medium',
          estimatedDelivery: formState.estimatedDelivery?.trim() || undefined,
          items: sanitizeItems(formState.items),
        }
        const created = await serviceOrdersApi.create(payload)
        setOrders((prev) => [created.order, ...prev])
        
        const printResult = await Swal.fire({
          icon: 'success',
          title: 'Orden creada',
          text: 'La orden de servicio fue registrada. ¿Deseas imprimir el ticket?',
          showCancelButton: true,
          confirmButtonText: 'Si, imprimir',
          cancelButtonText: 'No, cerrar',
          confirmButtonColor: '#2c5f7c',
          cancelButtonColor: '#7f8c8d',
        })

        if (printResult.isConfirmed) {
          const orderId = resolveOrderId(created.order)
          if (orderId) {
            try {
              await serviceOrdersApi.print(orderId)
              void Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Comando de impresion enviado.',
                showConfirmButton: false,
                timer: 3000,
              })
            } catch (printError) {
              const msg = printError instanceof Error ? printError.message : 'No fue posible enviar la orden a la impresora.'
              void Swal.fire({
                icon: 'error',
                title: 'Error de impresion',
                text: msg,
                confirmButtonColor: '#2c5f7c',
              })
            }
          }
        }
      }
      closePanel()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible guardar la orden.'
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

  const handlePrint = async (order: ServiceOrder) => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Imprimir orden',
      text: `Se imprimirá el ticket de la orden ${order.orderNumber || ''}.`,
      showCancelButton: true,
      confirmButtonText: 'Si, imprimir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2c5f7c',
      cancelButtonColor: '#7f8c8d',
    })

    if (!result.isConfirmed) {
      return
    }

    const orderId = resolveOrderId(order)
    if (!orderId) {
      void Swal.fire({
        icon: 'error',
        title: 'Operacion fallida',
        text: 'No fue posible identificar la orden.',
        confirmButtonColor: '#2c5f7c',
      })
      return
    }

    try {
      await serviceOrdersApi.print(orderId)
      void Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Comando de impresion enviado.',
        showConfirmButton: false,
        timer: 3000,
      })
    } catch (printError) {
      const msg = printError instanceof Error ? printError.message : 'No fue posible enviar la orden a la impresora.'
      void Swal.fire({
        icon: 'error',
        title: 'Error de impresion',
        text: msg,
        confirmButtonColor: '#2c5f7c',
      })
    }
  }

  const handleDelete = async (order: ServiceOrder) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Desactivar orden',
      text: `Se desactivara la orden ${order.orderNumber ?? ''}.`,
      showCancelButton: true,
      confirmButtonText: 'Si, desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e67e22',
      cancelButtonColor: '#7f8c8d',
    })

    if (!result.isConfirmed) {
      return
    }

    const orderId = resolveOrderId(order)
    if (!orderId) {
      void Swal.fire({
        icon: 'error',
        title: 'Operacion fallida',
        text: 'No fue posible identificar la orden.',
        confirmButtonColor: '#2c5f7c',
      })
      return
    }

    try {
      await serviceOrdersApi.remove(orderId)
      setOrders((prev) => prev.filter((item) => resolveOrderId(item) !== orderId))
      void Swal.fire({
        icon: 'success',
        title: 'Orden desactivada',
        text: 'La orden ya no aparece en la lista activa.',
        confirmButtonColor: '#2c5f7c',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible desactivar la orden.'
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

    const loadInitialOrders = async () => {
      try {
        const [data, customersData, techniciansData, productsData] = await Promise.all([
          serviceOrdersApi.list(),
          customersApi.list(),
          techniciansApi.list(),
          productsApi.list(),
        ])
        if (cancelled) {
          return
        }
        setOrders(data)
        setCustomers(customersData)
        setTechnicians(techniciansData)
        setProducts(productsData)
        setStatus('idle')
      } catch (error) {
        if (cancelled) {
          return
        }
        const message =
          error instanceof Error ? error.message : 'No fue posible cargar las ordenes de servicio.'
        setErrorMessage(message)
        setStatus('error')
      }
    }

    void loadInitialOrders()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <AdminLayout
      title="Ordenes de servicio"
      subtitle="Administra el ciclo de atencion, prioridad y estado de cada orden."
      actionLabel="Nueva orden"
      onAction={openCreatePanel}
    >
      <div className="admin-toolbar">
        <label className="search-field">
          <span>Buscar</span>
          <input
            type="search"
            placeholder="Folio, cliente, equipo o estado"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button className="btn btn-ghost" type="button" onClick={loadOrders}>
          Actualizar lista
        </button>
      </div>

      {status === 'loading' && (
        <div className="state-card">
          <p>Cargando ordenes de servicio...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="state-card state-error">
          <p>{errorMessage}</p>
          <button className="btn btn-secondary" type="button" onClick={loadOrders}>
            Reintentar
          </button>
        </div>
      )}

      {status === 'idle' && filteredOrders.length === 0 && (
        <div className="state-card">
          <p>No hay ordenes de servicio activas.</p>
          <button className="btn btn-secondary" type="button" onClick={openCreatePanel}>
            Crear primera orden
          </button>
        </div>
      )}

      {status === 'idle' && filteredOrders.length > 0 && (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Creacion</th>
                <th>Orden</th>
                <th>Equipo</th>
                <th className="col-status">Estado</th>
                <th>Prioridad</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={resolveOrderId(order) || `${order.customerId}-${order.deviceType}`}>
                  <td className="cell-date">{formatDate(order.createdAt)}</td>
                  <td>
                    <div className="cell-title">{order.orderNumber || 'Sin folio'}</div>
                    <span className="cell-subtitle">
                      {resolveCustomerName(order.customerId)}
                    </span>
                  </td>
                  <td>
                    <div className="cell-title">{order.deviceType}</div>
                    <span className="cell-subtitle">{order.deviceBrand}</span>
                  </td>
                  <td className="col-status">
                    <span className="badge">{statusLabels[order.status ?? 'pending']}</span>
                  </td>
                  <td>{priorityLabels[order.priority ?? 'medium']}</td>
                  <td>${(order.totalCost ?? 0).toLocaleString('es-CL')}</td>
                  <td>
                    <div className="row-actions">
                      {['delivered', 'cancelled'].includes(order.status) ? (
                        <button
                          className="btn btn-ghost btn-small btn-icon"
                          type="button"
                          onClick={() => openEditPanel(order)}
                          aria-label="Ver orden"
                          title="Ver"
                        >
                          👁️
                        </button>
                      ) : (
                        <button
                          className="btn btn-ghost btn-small btn-icon"
                          type="button"
                          onClick={() => openEditPanel(order)}
                          aria-label="Editar orden"
                          title="Editar"
                        >
                          ✏️
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-small btn-icon"
                        type="button"
                        onClick={() => handlePrint(order)}
                        aria-label="Imprimir orden"
                        title="Imprimir ticket"
                      >
                        🖨️
                      </button>
                      <button
                        className="btn btn-secondary btn-small btn-icon"
                        type="button"
                        onClick={() => handleDelete(order)}
                        aria-label="Desactivar orden"
                        title="Desactivar"
                      >
                        🚫
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
          <div className="modal modal-lg" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2>{isReadOnly ? 'Ver orden' : selectedOrder ? 'Editar orden' : 'Nueva orden'}</h2>
                  <p>
                    {isReadOnly
                      ? 'Esta orden esta finalizada y no puede ser modificada.'
                      : 'Completa la informacion requerida para guardar.'}
                  </p>
                </div>
              <button className="btn btn-secondary" type="button" onClick={closePanel}>
                Cerrar
              </button>
            </div>
            <form className="modal-form-wrapper" onSubmit={handleSubmit}>
              <div className="modal-scroll-area">
                <div className="form-grid">
              <label className="field">
                <span>Cliente</span>
                <select
                   value={formState.customerId}
                   onChange={(event) =>
                     setFormState((prev) => ({ ...prev, customerId: event.target.value }))
                   }
                   required
                   disabled={isEditing || isReadOnly}
                >
                  <option value="">Selecciona un cliente</option>
                  {customerOptions.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Tipo de equipo</span>
                <input
                  type="text"
                  value={formState.deviceType}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, deviceType: event.target.value }))
                  }
                  required
                  disabled={isReadOnly}
                />
              </label>
              <label className="field field-full">
                <span>Marca del equipo</span>
                <input
                  type="text"
                  value={formState.deviceBrand}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, deviceBrand: event.target.value }))
                  }
                  required
                  disabled={isReadOnly}
                />
              </label>
              <label className="field">
                <span>Modelo</span>
                <input
                  type="text"
                  value={formState.deviceModel ?? ''}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, deviceModel: event.target.value }))
                  }
                  disabled={isReadOnly}
                />
              </label>
              <label className="field">
                <span>Numero de serie</span>
                <input
                  type="text"
                  value={formState.serialNumber ?? ''}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, serialNumber: event.target.value }))
                  }
                  disabled={isReadOnly}
                />
              </label>
              <label className="field field-full">
                <span>Problema reportado</span>
                <input
                  type="text"
                  value={formState.problemDescription}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, problemDescription: event.target.value }))
                  }
                  required
                  disabled={isReadOnly}
                />
              </label>
              <label className="field">
                <span>Estado</span>
                <select
                  value={formState.status ?? 'pending'}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, status: event.target.value as ServiceOrderStatus }))
                  }
                  disabled={isReadOnly}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Prioridad</span>
                <select
                  value={formState.priority ?? 'medium'}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, priority: event.target.value as ServiceOrderPriority }))
                  }
                  disabled={isReadOnly}
                >
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Tecnico asignado</span>
                <select
                  value={formState.technicianId ?? ''}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, technicianId: event.target.value }))
                  }
                  disabled={isReadOnly}
                >
                  <option value="">Sin asignar</option>
                  {technicianOptions.map((technician) => (
                    <option key={technician.id} value={technician.id}>
                      {technician.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Fecha estimada</span>
                <input
                  type="date"
                  value={formState.estimatedDelivery ?? ''}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, estimatedDelivery: event.target.value }))
                  }
                  disabled={isReadOnly}
                />
              </label>
              <div className="table-card field-full">
                <div className="admin-toolbar items-toolbar">
                  <div className="row-actions">
                    <button
                      className="btn btn-secondary btn-small"
                      type="button"
                      onClick={addItemRow}
                      disabled={isReadOnly}
                    >
                      Agregar item
                    </button>
                  </div>
                </div>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Precio Unit.</th>
                      <th>Subtotal</th>
                      <th className="items-actions">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formState.items ?? []).length === 0 && (
                      <tr>
                        <td colSpan={5}>Sin items asociados.</td>
                      </tr>
                    )}
                    {(formState.items ?? []).map((item, index) => {
                      const quantity = item.quantity ?? 1
                      const unitPrice = Number.isFinite(item.unitPrice) ? item.unitPrice : 0
                      const subtotal = unitPrice * quantity
                      return (
                        <tr key={`${item.productId}-${index}`}>
                          <td>{item.productName}</td>
                          <td>{quantity}</td>
                          <td>{formatCurrency(unitPrice)}</td>
                          <td>{formatCurrency(subtotal)}</td>
                          <td className="items-actions">
                            <button
                              className="btn btn-ghost btn-small btn-icon"
                              type="button"
                              onClick={() => removeItemRow(index)}
                              aria-label="Eliminar item"
                              title="Eliminar"
                              disabled={isReadOnly}
                            >
                              🗑
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {(formState.items ?? []).length > 0 && (
                      <tr>
                        <td colSpan={3}>Total items</td>
                        <td>{formatCurrency(itemsTotal)}</td>
                        <td></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <label className="field">
                <span>Costo mano de obra</span>
                <input
                  type="number"
                  min="0"
                  value={formState.laborCost ?? ''}
                  onChange={(event) => {
                    const value = event.target.value
                    setFormState((prev) => ({
                      ...prev,
                      laborCost: value === '' ? undefined : Number(value),
                    }))
                  }}
                  disabled={isReadOnly}
                />
              </label>
              <label className="field field-full">
                <span>Diagnostico</span>
                <input
                  type="text"
                  value={formState.diagnosis ?? ''}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, diagnosis: event.target.value }))
                  }
                  disabled={isReadOnly}
                />
              </label>
              <label className="field field-full">
                <span>Trabajo realizado</span>
                <input
                  type="text"
                  value={formState.workDone ?? ''}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, workDone: event.target.value }))
                  }
                  disabled={isReadOnly}
                />
              </label>
            </div>
          </div>
          <div className="form-actions modal-footer-actions">
            {isReadOnly ? null : (
              <button
                className="btn btn-primary"
                type="submit"
                aria-disabled={isEditing && !isUpdateDirty}
                disabled={isSaving}
                onClick={(event) => {
                  if (isEditing && !isUpdateDirty) {
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
                {isSaving ? 'Guardando...' : selectedOrder ? 'Guardar cambios' : 'Crear orden'}
              </button>
            )}
            <button className="btn btn-secondary" type="button" onClick={closePanel}>
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
