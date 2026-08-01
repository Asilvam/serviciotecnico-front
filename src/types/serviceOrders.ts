export type ServiceOrderStatus =
  | 'pending'
  | 'in_progress'
  | 'waiting_parts'
  | 'completed'
  | 'delivered'
  | 'cancelled'

export type ServiceOrderPriority = 'low' | 'medium' | 'high' | 'urgent'
export type PrinterProfile = 'thermal_escpos' | 'system_pdf'

export type ServiceOrderItem = {
  productId: string
  productName: string
  unitPrice: number
  quantity?: number
}

export type ServiceOrder = {
  id?: string
  _id?: string
  orderNumber?: string
  customerId: string
  customerName?: string
  technicianId?: string | null
  technicianName?: string
  deviceType: string
  deviceBrand: string
  deviceModel?: string
  serialNumber?: string
  problemDescription: string
  diagnosis?: string
  workDone?: string
  status?: ServiceOrderStatus
  priority?: ServiceOrderPriority
  laborCost?: number
  partsCost?: number
  totalCost?: number
  items?: ServiceOrderItem[]
  estimatedDelivery?: string
  deliveredAt?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export type CreateServiceOrderPayload = {
  customerId: string
  technicianId?: string
  deviceType: string
  deviceBrand: string
  deviceModel?: string
  serialNumber?: string
  problemDescription: string
  priority?: ServiceOrderPriority
  estimatedDelivery?: string
  items?: ServiceOrderItem[]
}

export type UpdateServiceOrderPayload = {
  customerId?: string
  technicianId?: string | null
  deviceType?: string
  deviceBrand?: string
  deviceModel?: string | null
  serialNumber?: string | null
  problemDescription?: string
  diagnosis?: string | null
  workDone?: string | null
  status?: ServiceOrderStatus
  priority?: ServiceOrderPriority
  laborCost?: number
  estimatedDelivery?: string | null
  items?: ServiceOrderItem[]
}

export type ServiceOrderCreateResponse = {
  order: ServiceOrder
  actions?: {
    print?: {
      method: string
      url: string
    }
    print80mm?: {
      method: string
      url: string
    }
  }
}

export type PrintTicketResult = {
  jobId: string
  printerId: string
  printerProfile: PrinterProfile
  orderId: string
  orderNumber: string
  status: PrintJobStatus
  queuedAt: string
}

export type PrintJobStatus =
  | 'queued'
  | 'printing'
  | 'sent_to_printer'
  | 'sent_to_printer_with_warning'
  | 'failed'
  | 'unknown'

export type PrintJob = PrintTicketResult & {
  startedAt?: string
  completedAt?: string
  errorCode?: string
  errorMessage?: string
  warnings?: string[]
}

export type PublicTrackingResult = {
  orderNumber: string
  device: {
    type: string
    brand: string
    model?: string
  }
  status: ServiceOrderStatus
  statusLabelEs: string
  estimatedDelivery?: string
  updatedAt?: string
  trackingExpiresAt?: string
}
