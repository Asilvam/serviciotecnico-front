import { apiClient } from './apiClient.ts'
import type { Product, ProductPayload } from '../types/products.ts'

export const productsApi = {
  list() {
    return apiClient.get<Product[]>('/products')
  },
  create(payload: ProductPayload) {
    return apiClient.post<Product>('/products', payload)
  },
  update(id: string, payload: Partial<ProductPayload>) {
    return apiClient.patch<Product>(`/products/${id}`, payload)
  },
  remove(id: string) {
    return apiClient.delete<void>(`/products/${id}`)
  },
}
