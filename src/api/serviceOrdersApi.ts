import { apiClient } from './apiClient.ts'
import type {
  CreateServiceOrderPayload,
  ServiceOrder,
  ServiceOrderCreateResponse,
  UpdateServiceOrderPayload,
} from '../types/serviceOrders.ts'

export const serviceOrdersApi = {
  list() {
    return apiClient.get<ServiceOrder[]>('/service-orders')
  },
  create(payload: CreateServiceOrderPayload) {
    return apiClient.post<ServiceOrderCreateResponse>('/service-orders', payload)
  },
  update(id: string, payload: UpdateServiceOrderPayload) {
    return apiClient.patch<ServiceOrder>(`/service-orders/${id}`, payload)
  },
  remove(id: string) {
    return apiClient.delete<void>(`/service-orders/${id}`)
  },
}
