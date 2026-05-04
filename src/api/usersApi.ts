import { apiClient } from './apiClient.ts'
import type { User, UserPayload } from '../types/users.ts'

export const usersApi = {
  list() {
    return apiClient.get<User[]>('/users')
  },
  create(payload: UserPayload & { password: string }) {
    return apiClient.post<User>('/users', payload)
  },
  update(id: string, payload: Partial<UserPayload>) {
    return apiClient.patch<User>(`/users/${id}`, payload)
  },
  remove(id: string) {
    return apiClient.delete<void>(`/users/${id}`)
  },
}
