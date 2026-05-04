import { apiClient } from './apiClient.ts'
import type { Technician, TechnicianPayload } from '../types/technicians.ts'

export const techniciansApi = {
  list() {
    return apiClient.get<Technician[]>('/technicians')
  },
  create(payload: TechnicianPayload) {
    return apiClient.post<Technician>('/technicians', payload)
  },
  update(id: string, payload: Partial<TechnicianPayload>) {
    return apiClient.patch<Technician>(`/technicians/${id}`, payload)
  },
  remove(id: string) {
    return apiClient.delete<void>(`/technicians/${id}`)
  },
}
