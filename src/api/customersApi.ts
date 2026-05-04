import { apiClient } from './apiClient.ts'
import type { Customer, CustomerPayload } from '../types/customers.ts'

export const customersApi = {
  list() {
    return apiClient.get<Customer[]>('/customers')
  },
  create(payload: CustomerPayload) {
    return apiClient.post<Customer>('/customers', payload)
  },
  update(id: string, payload: Partial<CustomerPayload>) {
    return apiClient.patch<Customer>(`/customers/${id}`, payload)
  },
  remove(id: string) {
    return apiClient.delete<void>(`/customers/${id}`)
  },
}
