import { useCallback, useEffect, useMemo, useState, type ComponentProps } from 'react'
import Swal from 'sweetalert2'
import AdminLayout from '../components/AdminLayout.tsx'
import ActionIcon from '../components/ActionIcon.tsx'
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
import { getSession } from '../auth/session.ts'
import { hasCapability } from '../auth/capabilities.ts'

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

const trimText = (value?: string | null): string => value?.trim() ?? ''

const normalizeDeviceType = (value?: string | null): string =>
  trimText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()

const isValidDeviceType = (value: string): boolean => /^[A-Z0-9]+$/.test(value)

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ??
      character,
  )

const technicianStatusTransitions: Partial<Record<ServiceOrderStatus, ServiceOrderStatus[]>> = {
  pending: ['in_progress'],
  in_progress: ['waiting_parts', 'completed'],
  waiting_parts: ['in_progress', 'completed'],
}

const selectChangedFields = (
  current: UpdateServiceOrderPayload,
  initial: UpdateServiceOrderPayload,
): UpdateServiceOrderPayload =>
  Object.fromEntries(
    (Object.keys(current) as Array<keyof UpdateServiceOrderPayload>)
      .filter((field) => JSON.stringify(current[field]) !== JSON.stringify(initial[field]))
      .map((field) => [field, current[field]]),
  ) as UpdateServiceOrderPayload

export default function ServiceOrdersPage() {
  const role = getSession()?.role
  const isAdmin = role === 'admin'
  const isReceptionist = role === 'receptionist'
  const isTechnician = role === 'technician'
  const canCreate = hasCapability(role, 'create_orders')
  const canCancel = hasCapability(role, 'cancel_orders')
  const [orders, setOrders] = useState<ServiceOrder[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [query, setQuery] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [formState, setFormState] = useState<ServiceOrderFormState>(emptyOrder)
  const [deviceTypeError, setDeviceTypeError] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null)
  const isEditing = Boolean(selectedOrder)
  const [isSaving, setIsSaving] = useState(false)

  const selectedStatus = selectedOrder?.status ?? 'pending'
  const canEditIntake = !isEditing
    ? canCreate
    : isAdmin || (isReceptionist && selectedStatus === 'pending')
  const canEditManagement = !isEditing
    ? canCreate
    : isAdmin ||
      (isReceptionist && ['pending', 'in_progress', 'waiting_parts'].includes(selectedStatus))
  const canEditTechnical =
    isEditing && (isAdmin || (isTechnician && !['completed', 'delivered', 'cancelled'].includes(selectedStatus)))
  const canEditLaborCost = isEditing && isAdmin
  const canChangeStatus =
    isEditing &&
    (isAdmin ||
      (isReceptionist && selectedStatus === 'completed') ||
      (isTechnician && (technicianStatusTransitions[selectedStatus]?.length ?? 0) > 0))
  const canSubmit = !isEditing
    ? canCreate
    : canEditIntake || canEditManagement || canEditTechnical || canEditLaborCost || canChangeStatus
  const isReadOnly = isEditing && !canSubmit

  const availableStatuses = useMemo(() => {
    if (!selectedOrder) return []
    if (isAdmin) {
      return (Object.keys(statusLabels) as ServiceOrderStatus[]).filter(
        (statusValue) => statusValue !== 'cancelled' || selectedStatus === 'cancelled',
      )
    }
    if (isReceptionist && selectedStatus === 'completed') {
      return ['completed', 'delivered'] as ServiceOrderStatus[]
    }
    if (isTechnician) {
      return [selectedStatus, ...(technicianStatusTransitions[selectedStatus] ?? [])]
    }
    return [selectedStatus]
  }, [isAdmin, isReceptionist, isTechnician, selectedOrder, selectedStatus])

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
    (customerId?: string, customerName?: string) => {
      if (customerId) {
        return customersById[customerId]?.name || customerName || `Cliente desconocido (ID: ${customerId})`
      }
      return customerName || 'Cliente no disponible'
    },
    [customersById],
  )

  const resolveTechnicianName = useCallback(
    (technicianId?: string | null, technicianName?: string) =>
      technicianId
        ? techniciansById[technicianId]?.name || technicianName || `Tecnico desconocido (ID: ${technicianId})`
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
        const availability =
          product.type === 'service' ? 'Servicio' : `Stock: ${product.stock ?? 0}`
        const label = `${product.name} (${product.sku}) - ${availability} - $${product.price.toLocaleString('es-CL')}`
        return `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`
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
    (state: ServiceOrderFormState, order: ServiceOrder): UpdateServiceOrderPayload => {
      const payload: UpdateServiceOrderPayload = {}
      const orderStatus = order.status ?? 'pending'

      if (isAdmin || (isReceptionist && orderStatus === 'pending')) {
        payload.customerId = trimText(state.customerId)
        payload.deviceType = normalizeDeviceType(state.deviceType)
        payload.deviceBrand = trimText(state.deviceBrand)
        payload.deviceModel = trimText(state.deviceModel) || null
        payload.serialNumber = trimText(state.serialNumber) || null
        payload.problemDescription = trimText(state.problemDescription)
      }

      if (
        isAdmin ||
        (isReceptionist && ['pending', 'in_progress', 'waiting_parts'].includes(orderStatus))
      ) {
        payload.technicianId = trimText(state.technicianId) || null
        payload.priority = state.priority ?? 'medium'
        payload.estimatedDelivery = trimText(state.estimatedDelivery) || null
      }

      if (isAdmin || isTechnician) {
        payload.diagnosis = trimText(state.diagnosis) || null
        payload.workDone = trimText(state.workDone) || null
        payload.items = sanitizeItems(state.items)
      }

      if (isAdmin) {
        payload.laborCost =
          state.laborCost !== undefined && !Number.isNaN(state.laborCost)
            ? Number(state.laborCost)
            : undefined
      }

      if (state.status && state.status !== orderStatus) {
        payload.status = state.status
      }

      return payload
    },
    [isAdmin, isReceptionist, isTechnician],
  )

  const initialUpdatePayload = useMemo(() => {
    if (!selectedOrder) {
      return null
    }
    const initialState: ServiceOrderFormState = {
      customerId: selectedOrder.customerId ?? '',
      technicianId: selectedOrder.technicianId ?? undefined,
      deviceType: selectedOrder.deviceType ?? '',
      deviceBrand: selectedOrder.deviceBrand ?? '',
      deviceModel: selectedOrder.deviceModel ?? undefined,
      serialNumber: selectedOrder.serialNumber ?? undefined,
      problemDescription: selectedOrder.problemDescription ?? '',
      diagnosis: selectedOrder.diagnosis ?? undefined,
      workDone: selectedOrder.workDone ?? undefined,
      status: selectedOrder.status ?? 'pending',
      priority: selectedOrder.priority ?? 'medium',
      laborCost: selectedOrder.laborCost ?? undefined,
      estimatedDelivery: selectedOrder.estimatedDelivery ?? undefined,
      items: sanitizeItems(selectedOrder.items),
    }
    return normalizeUpdatePayload(initialState, selectedOrder)
  }, [selectedOrder, normalizeUpdatePayload])

  const isUpdateDirty = useMemo(() => {
    if (!selectedOrder || !initialUpdatePayload) {
      return false
    }
    const current = normalizeUpdatePayload(formState, selectedOrder)
    return JSON.stringify(current) !== JSON.stringify(initialUpdatePayload)
  }, [selectedOrder, initialUpdatePayload, formState, normalizeUpdatePayload])

  const customerOptions = useMemo(
    () =>
      buildDynamicOptions({
        items: customers.filter((customer) => customer.isActive !== false),
        currentId: formState.customerId,
        resolveId: resolveCustomerId,
        resolveLabel: (customer) => customer.name,
        unknownLabel: (id) =>
          selectedOrder?.customerId === id && selectedOrder.customerName
            ? selectedOrder.customerName
            : `Cliente desconocido (ID: ${id})`,
      }),
    [customers, formState.customerId, selectedOrder],
  )

  const technicianOptions = useMemo(
    () =>
      buildDynamicOptions({
        items: technicians.filter((technician) => technician.isActive !== false),
        currentId: formState.technicianId,
        resolveId: resolveTechnicianId,
        resolveLabel: (technician) => technician.name,
        unknownLabel: (id) => {
          const inactiveTechnician = techniciansById[id]
          if (inactiveTechnician?.isActive === false) {
            return `${inactiveTechnician.name} (No disponible)`
          }
          return selectedOrder?.technicianId === id && selectedOrder.technicianName
            ? selectedOrder.technicianName
            : `Tecnico desconocido (ID: ${id})`
        },
      }),
    [technicians, techniciansById, formState.technicianId, selectedOrder],
  )

  const deviceTypeSuggestions = useMemo(() => {
    const normalizedTypes = orders
      .map((order) => normalizeDeviceType(order.deviceType ?? ''))
      .filter((deviceType) => isValidDeviceType(deviceType))

    return Array.from(new Set(normalizedTypes)).sort((a, b) =>
      a.localeCompare(b, 'es'),
    )
  }, [orders])

  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return orders
    }
    return orders.filter((order) => {
      const statusLabel = statusLabels[order.status ?? 'pending'].toLowerCase()
      const priorityLabel = priorityLabels[order.priority ?? 'medium'].toLowerCase()
      const customerName = resolveCustomerName(order.customerId, order.customerName).toLowerCase()
      const technicianName = resolveTechnicianName(order.technicianId, order.technicianName).toLowerCase()
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
      const [data, productsData] = await Promise.all([
        serviceOrdersApi.list(),
        productsApi.list(),
      ])
      setOrders(data)
      setProducts(productsData)
      if (!isTechnician) {
        const [customersData, techniciansData] = await Promise.all([
          customersApi.list(),
          techniciansApi.list(),
        ])
        setCustomers(customersData)
        setTechnicians(techniciansData)
      }
      setStatus('idle')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No fue posible cargar las ordenes de servicio.'
      setErrorMessage(message)
      setStatus('error')
    }
  }, [isTechnician])

  const openCreatePanel = () => {
    setSelectedOrder(null)
    setFormState({ ...emptyOrder, items: [] })
    setDeviceTypeError('')
    setPanelOpen(true)
  }

  const openEditPanel = (order: ServiceOrder) => {
    setSelectedOrder(order)
    setFormState({
      customerId: order.customerId ?? '',
      technicianId: order.technicianId ?? '',
      deviceType: order.deviceType ?? '',
      deviceBrand: order.deviceBrand ?? '',
      deviceModel: order.deviceModel ?? '',
      serialNumber: order.serialNumber ?? '',
      problemDescription: order.problemDescription ?? '',
      status: order.status ?? 'pending',
      priority: order.priority ?? 'medium',
      diagnosis: order.diagnosis ?? '',
      workDone: order.workDone ?? '',
      laborCost: order.laborCost,
      estimatedDelivery: order.estimatedDelivery ?? '',
      items: order.items ?? [],
    })
    setDeviceTypeError('')
    setPanelOpen(true)
  }

  const closePanel = useCallback(() => {
    setPanelOpen(false)
    setSelectedOrder(null)
    setFormState(emptyOrder)
    setDeviceTypeError('')
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
    const normalizedDeviceType = normalizeDeviceType(formState.deviceType)
    if (!isValidDeviceType(normalizedDeviceType)) {
      setDeviceTypeError('Ingresa solo una palabra en categoria (sin espacios ni simbolos).')
      void Swal.fire({
        icon: 'warning',
        title: 'Categoria invalida',
        text: 'Ingresa solo una palabra para la categoria del equipo. Ejemplos: CELULAR, NOTEBOOK, MAC.',
        confirmButtonColor: '#2c5f7c',
      })
      return
    }

    setDeviceTypeError('')
    setFormState((prev) => ({ ...prev, deviceType: normalizedDeviceType }))
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

        const currentPayload = normalizeUpdatePayload(formState, selectedOrder)
        const payload = selectChangedFields(currentPayload, initialUpdatePayload ?? {})
        const updated = await serviceOrdersApi.update(orderId, payload)
        setOrders((prev) =>
          prev.map((item) =>
            resolveOrderId(item) === orderId ? { ...item, ...updated } : item,
          ),
        )
        await Swal.fire({
          icon: 'success',
          title: 'Orden actualizada',
          text: 'Los datos fueron guardados correctamente.',
          confirmButtonColor: '#2c5f7c',
        })
      } else {
        const payload: CreateServiceOrderPayload = {
          customerId: trimText(formState.customerId),
          technicianId: trimText(formState.technicianId) || undefined,
          deviceType: normalizedDeviceType,
          deviceBrand: trimText(formState.deviceBrand),
          deviceModel: trimText(formState.deviceModel) || undefined,
          serialNumber: trimText(formState.serialNumber) || undefined,
          problemDescription: trimText(formState.problemDescription),
          priority: formState.priority ?? 'medium',
          estimatedDelivery: trimText(formState.estimatedDelivery) || undefined,
          ...(isAdmin ? { items: sanitizeItems(formState.items) } : {}),
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

  const handleCancel = async (order: ServiceOrder) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Cancelar orden',
      text: `Se cancelara la orden ${order.orderNumber ?? ''} y se devolveran sus repuestos al stock.`,
      showCancelButton: true,
      confirmButtonText: 'Si, cancelar',
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
      const cancelledOrder = await serviceOrdersApi.cancel(orderId)
      setOrders((prev) =>
        prev.map((item) =>
          resolveOrderId(item) === orderId
            ? { ...item, ...cancelledOrder }
            : item,
        ),
      )
      void Swal.fire({
        icon: 'success',
        title: 'Orden cancelada',
        text: 'La orden fue cancelada y el stock asociado fue restaurado.',
        confirmButtonColor: '#2c5f7c',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible cancelar la orden.'
      void Swal.fire({
        icon: 'error',
        title: 'Operacion fallida',
        text: message,
        confirmButtonColor: '#2c5f7c',
      })
    }
  }

  const handlePermanentDelete = async (order: ServiceOrder) => {
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

    const result = await Swal.fire({
      icon: 'error',
      title: 'Eliminar orden definitivamente',
      html: `La orden <strong>${escapeHtml(order.orderNumber ?? orderId)}</strong> sera borrada fisicamente.<br><br>Esta accion no se puede deshacer. El evento y los datos principales quedaran registrados en auditoria.`,
      showCancelButton: true,
      confirmButtonText: 'Si, eliminar definitivamente',
      cancelButtonText: 'Conservar orden',
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#7f8c8d',
      focusCancel: true,
    })

    if (!result.isConfirmed) {
      return
    }

    try {
      await serviceOrdersApi.deletePermanent(orderId)
      setOrders((prev) => prev.filter((item) => resolveOrderId(item) !== orderId))
      void Swal.fire({
        icon: 'success',
        title: 'Orden eliminada',
        text: 'La orden fue eliminada definitivamente y la accion quedo registrada.',
        confirmButtonColor: '#2c5f7c',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible eliminar la orden.'
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
        const [data, productsData] = await Promise.all([
          serviceOrdersApi.list(),
          productsApi.list(),
        ])
        const directoryData = isTechnician
          ? null
          : await Promise.all([customersApi.list(), techniciansApi.list()])
        if (cancelled) return
        setOrders(data)
        setProducts(productsData)
        if (directoryData) {
          setCustomers(directoryData[0])
          setTechnicians(directoryData[1])
        }
        setStatus('idle')
      } catch (error) {
        if (cancelled) return
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
  }, [isTechnician])

  return (
    <AdminLayout
      title={isTechnician ? 'Mis ordenes de servicio' : 'Ordenes de servicio'}
      subtitle={
        isTechnician
          ? 'Consulta y actualiza el trabajo tecnico de las ordenes que tienes asignadas.'
          : 'Administra el ciclo de atencion, prioridad y estado de cada orden.'
      }
      actionLabel={canCreate ? 'Nueva orden' : undefined}
      onAction={canCreate ? openCreatePanel : undefined}
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
          <p>{isTechnician ? 'No tienes ordenes asignadas.' : 'No hay ordenes de servicio activas.'}</p>
          {canCreate && <button className="btn btn-secondary" type="button" onClick={openCreatePanel}>
            Crear primera orden
          </button>}
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
                      {resolveCustomerName(order.customerId, order.customerName)}
                    </span>
                  </td>
                  <td>
                    <div className="cell-title">{order.deviceType}</div>
                    <span className="cell-subtitle">{order.deviceBrand}</span>
                  </td>
                  <td className="col-status">
                    <span
                      className={`badge ${order.status === 'cancelled' ? 'badge-cancelled' : ''}`}
                    >
                      {statusLabels[order.status ?? 'pending']}
                    </span>
                  </td>
                  <td>{priorityLabels[order.priority ?? 'medium']}</td>
                  <td>${(order.totalCost ?? 0).toLocaleString('es-CL')}</td>
                  <td>
                    <div className="row-actions">
                      {['delivered', 'cancelled'].includes(order.status ?? 'pending') ? (
                        <button
                          className="btn btn-ghost btn-small btn-icon"
                          type="button"
                          onClick={() => openEditPanel(order)}
                          aria-label="Ver orden"
                          title="Ver"
                        >
                          <ActionIcon name="view" />
                        </button>
                      ) : (
                        <button
                          className="btn btn-ghost btn-small btn-icon"
                          type="button"
                          onClick={() => openEditPanel(order)}
                          aria-label="Editar orden"
                          title="Editar"
                        >
                          <ActionIcon name="edit" />
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-small btn-icon"
                        type="button"
                        onClick={() => handlePrint(order)}
                        aria-label="Imprimir orden"
                        title="Imprimir ticket"
                      >
                        <ActionIcon name="print" />
                      </button>
                      {canCancel &&
                        !['delivered', 'cancelled'].includes(order.status ?? 'pending') && (
                          <button
                            className="btn btn-secondary btn-small btn-icon"
                            type="button"
                            onClick={() => handleCancel(order)}
                            aria-label="Cancelar orden"
                            title="Cancelar"
                          >
                            <ActionIcon name="disable" />
                          </button>
                        )}
                      {isAdmin && (
                        <button
                          className="btn btn-danger btn-small btn-icon"
                          type="button"
                          onClick={() => handlePermanentDelete(order)}
                          aria-label="Eliminar orden definitivamente"
                          title="Eliminar definitivamente"
                        >
                          <ActionIcon name="delete" />
                        </button>
                      )}
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
                <h2>
                  {isReadOnly
                    ? 'Detalle de la orden'
                    : isEditing
                      ? 'Seguimiento de la orden'
                      : 'Ingreso de equipo'}
                </h2>
                <p>
                  {isReadOnly
                    ? 'Esta orden esta finalizada y se muestra en modo de consulta.'
                    : isEditing
                      ? 'Actualiza el avance tecnico, los repuestos, los servicios y los costos.'
                      : 'Registra al cliente, el equipo recibido y la falla informada.'}
                </p>
              </div>
              <button className="btn btn-secondary" type="button" onClick={closePanel}>
                Cerrar
              </button>
            </div>
            <form className="modal-form-wrapper" onSubmit={handleSubmit}>
              <div className="modal-scroll-area">
                <fieldset className="form-section">
                  <legend>Datos de recepcion</legend>
                  <p className="form-section-help">
                    {isEditing
                      ? 'Estos datos corresponden al ingreso original del equipo.'
                      : 'Identifica al cliente y describe el equipo que queda en el servicio tecnico.'}
                  </p>
                  <div className="form-grid">
                    <label className="field">
                      <span>Cliente</span>
                      <select
                        value={formState.customerId}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, customerId: event.target.value }))
                        }
                        required
                        disabled={!canEditIntake}
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
                      <span>Categoria o tipo de equipo</span>
                      <input
                        type="text"
                        list="device-type-suggestions"
                        value={formState.deviceType}
                        onChange={(event) => {
                          setFormState((prev) => ({ ...prev, deviceType: event.target.value }))
                          if (deviceTypeError) {
                            setDeviceTypeError('')
                          }
                        }}
                        onBlur={() => {
                          const normalizedValue = normalizeDeviceType(formState.deviceType)
                          setFormState((prev) => ({ ...prev, deviceType: normalizedValue }))
                          if (!isValidDeviceType(normalizedValue)) {
                            setDeviceTypeError('Ingresa solo una palabra en categoria (sin espacios ni simbolos).')
                            return
                          }
                          setDeviceTypeError('')
                        }}
                        placeholder="Ej. Celular, notebook, monitor"
                        required
                        disabled={!canEditIntake}
                      />
                      {deviceTypeError && <small className="field-error">{deviceTypeError}</small>}
                      <datalist id="device-type-suggestions">
                        {deviceTypeSuggestions.map((deviceType) => (
                          <option key={deviceType} value={deviceType} />
                        ))}
                      </datalist>
                    </label>
                    <label className="field">
                      <span>Marca</span>
                      <input
                        type="text"
                        value={formState.deviceBrand}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, deviceBrand: event.target.value }))
                        }
                        required
                        disabled={!canEditIntake}
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
                        disabled={!canEditIntake}
                      />
                    </label>
                    <label className="field field-full">
                      <span>Numero de serie o IMEI</span>
                      <input
                        type="text"
                        value={formState.serialNumber ?? ''}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, serialNumber: event.target.value }))
                        }
                        placeholder="Segun corresponda al equipo"
                        disabled={!canEditIntake}
                      />
                    </label>
                    <label className="field field-full">
                      <span>Falla informada por el cliente</span>
                      <textarea
                        rows={3}
                        value={formState.problemDescription}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, problemDescription: event.target.value }))
                        }
                        required
                        disabled={!canEditIntake}
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="form-section">
                  <legend>{isEditing ? 'Gestion de la orden' : 'Gestion inicial'}</legend>
                  <p className="form-section-help">
                    {isEditing
                      ? 'Administra responsable, prioridad, avance y fecha comprometida.'
                      : 'La asignacion y la fecha son opcionales y pueden definirse mas adelante.'}
                  </p>
                  <div className="form-grid">
                    {isEditing && (
                      <label className="field">
                        <span>Estado</span>
                        <select
                          value={formState.status ?? 'pending'}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              status: event.target.value as ServiceOrderStatus,
                            }))
                          }
                          disabled={!canChangeStatus}
                        >
                          {availableStatuses.map((statusValue) => (
                            <option key={statusValue} value={statusValue}>
                              {statusLabels[statusValue]}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label className="field">
                      <span>Prioridad</span>
                      <select
                        value={formState.priority ?? 'medium'}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            priority: event.target.value as ServiceOrderPriority,
                          }))
                        }
                        disabled={!canEditManagement}
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
                        disabled={!canEditManagement}
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
                          setFormState((prev) => ({
                            ...prev,
                            estimatedDelivery: event.target.value,
                          }))
                        }
                        disabled={!canEditManagement}
                      />
                    </label>
                  </div>
                </fieldset>

                {isEditing && (
                  <fieldset className="form-section">
                    <legend>Trabajo tecnico y costos</legend>
                    <p className="form-section-help">
                      Registra el diagnostico, el trabajo realizado y los items utilizados.
                    </p>
                    <div className="form-grid">
                      <label className="field field-full">
                        <span>Diagnostico</span>
                        <textarea
                          rows={3}
                          value={formState.diagnosis ?? ''}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, diagnosis: event.target.value }))
                          }
                          disabled={!canEditTechnical}
                        />
                      </label>
                      <label className="field field-full">
                        <span>Trabajo realizado</span>
                        <textarea
                          rows={3}
                          value={formState.workDone ?? ''}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, workDone: event.target.value }))
                          }
                          disabled={!canEditTechnical}
                        />
                      </label>
                      <div className="table-card field-full">
                        <div className="admin-toolbar items-toolbar">
                          <strong>Repuestos y servicios</strong>
                          <div className="row-actions">
                            <button
                              className="btn btn-secondary btn-small"
                              type="button"
                              onClick={addItemRow}
                              disabled={!canEditTechnical}
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
                              const unitPrice = Number.isFinite(item.unitPrice)
                                ? item.unitPrice
                                : 0
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
                                      disabled={!canEditTechnical}
                                    >
                                      <ActionIcon name="delete" />
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
                          disabled={!canEditLaborCost}
                        />
                      </label>
                    </div>
                  </fieldset>
                )}
              </div>
              <div className="form-actions modal-footer-actions">
                {canSubmit ? (
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
                    {isSaving
                      ? 'Guardando...'
                      : isEditing
                        ? 'Guardar seguimiento'
                        : 'Registrar ingreso'}
                  </button>
                ) : null}
                <button className="btn btn-secondary" type="button" onClick={closePanel}>
                  {isReadOnly ? 'Cerrar' : 'Cancelar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
