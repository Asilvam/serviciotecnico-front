export type Customer = {
  id?: string
  _id?: string
  name: string
  email: string
  rut?: string
  phone?: string
  address?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export type CustomerPayload = {
  name: string
  email: string
  rut?: string
  phone?: string
  address?: string
  isActive?: boolean
}
