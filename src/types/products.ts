export type ProductType = 'part' | 'service'

export type Product = {
  id?: string
  _id?: string
  name: string
  description?: string
  sku: string
  price: number
  type?: ProductType
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
  type?: ProductType
  stock?: number
}
