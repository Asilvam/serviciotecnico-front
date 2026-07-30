export type UserRole = 'admin' | 'technician' | 'receptionist'

export type User = {
  id?: string
  _id?: string
  email: string
  name: string
  role?: UserRole
  technicianId?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export type UserPayload = {
  email: string
  name: string
  role?: UserRole
  technicianId?: string
  password?: string
  isActive?: boolean
}
