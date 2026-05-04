export type ServiceOrderStatus =
  | 'pending'
  | 'in_progress'
  | 'waiting_parts'
  | 'completed'
  | 'delivered'
  | 'cancelled'

export type ServiceOrderPriority = 'low' | 'medium' | 'high' | 'urgent'

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
  technicianId?: string
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
  technicianId?: string
  diagnosis?: string
  workDone?: string
  status?: ServiceOrderStatus
  priority?: ServiceOrderPriority
  laborCost?: number
  estimatedDelivery?: string
  items?: ServiceOrderItem[]
}

export type ServiceOrderCreateResponse = {
  order: ServiceOrder
  actions?: {
    print80mm?: {
      method: string
      url: string
    }
  }
}
