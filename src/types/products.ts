export type Product = {
  id?: string
  _id?: string
  name: string
  description?: string
  sku: string
  price: number
  stock?: number
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export type ProductPayload = {
  name: string
  description?: string
  sku: string
  price: number
  stock?: number
}
