import { apiClient } from './apiClient.ts'
import type {
  CreateServiceOrderPayload,
  PrintJob,
  PrinterProfile,
  PrintTicketResult,
  ServiceOrder,
  ServiceOrderCreateResponse,
  UpdateServiceOrderPayload,
} from '../types/serviceOrders.ts'

export const serviceOrdersApi = {
  list() {
    return apiClient.get<ServiceOrder[]>('/service-orders')
  },
  async create(payload: CreateServiceOrderPayload) {
    const result = await apiClient.post<ServiceOrderCreateResponse>(
      '/service-orders',
      payload,
    )
    if (
      !payload.deviceBrandId ||
      (payload.deviceModel && !payload.deviceModelId)
    )
      apiClient.invalidateCache('/device-catalog')
    return result
  },
  async update(id: string, payload: UpdateServiceOrderPayload) {
    const result = await apiClient.patch<ServiceOrder>(
      `/service-orders/${id}`,
      payload,
    )
    if (
      (payload.deviceBrand && !payload.deviceBrandId) ||
      (payload.deviceModel && !payload.deviceModelId)
    )
      apiClient.invalidateCache('/device-catalog')
    return result
  },
  cancel(id: string) {
    return apiClient.delete<ServiceOrder>(`/service-orders/${id}`)
  },
  deletePermanent(id: string) {
    return apiClient.delete<void>(`/service-orders/${id}/permanent`)
  },
  print(id: string, printerProfile: PrinterProfile) {
    return apiClient.post<PrintTicketResult>(`/service-orders/${id}/print`, {
      printerProfile,
    })
  },
  getPrintJob(jobId: string) {
    return apiClient.get<PrintJob>(`/print-jobs/${jobId}`, {
      bypassCache: true,
    })
  },
}
