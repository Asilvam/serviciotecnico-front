export type CatalogBrand = { id: string; name: string; active: boolean }
export type CatalogModel = {
  id: string
  brandId: string
  name: string
  active: boolean
  category: 'phone'
  variants: { deviceCode: string; modelCode: string }[]
}
export type CatalogPage<T> = { items: T[]; nextCursor: string | null }
