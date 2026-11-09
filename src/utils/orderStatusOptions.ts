import type { ServiceOrderStatus } from '../types/serviceOrders.ts'

export const orderStatusLabels: Record<ServiceOrderStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En proceso',
  waiting_parts: 'Espera repuestos',
  completed: 'Completada',
  delivered: 'Entregada',
  cancelled: 'Cancelada',
}
export const technicianStatusTransitions: Partial<Record<ServiceOrderStatus, ServiceOrderStatus[]>> = {
  pending: ['in_progress'],
  in_progress: ['waiting_parts', 'completed'],
  waiting_parts: ['in_progress', 'completed'],
}
export function orderStatusOptions(role: string | undefined, current: ServiceOrderStatus): ServiceOrderStatus[] {
  if (role === 'admin') return (Object.keys(orderStatusLabels) as ServiceOrderStatus[]).filter(status => status !== 'cancelled' || current === 'cancelled')
  if (role === 'receptionist' && current === 'completed') return ['completed', 'delivered']
  if (role === 'technician') return [current, ...(technicianStatusTransitions[current] ?? [])]
  return [current]
}
