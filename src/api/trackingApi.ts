import { apiClient } from './apiClient.ts'
import type { PublicTrackingResult } from '../types/serviceOrders.ts'

export const trackingApi = {
  find(token: string) {
    return apiClient.get<PublicTrackingResult>(`/tracking/${encodeURIComponent(token)}`, {
      requiresAuth: false,
      bypassCache: true,
    })
  },
}
