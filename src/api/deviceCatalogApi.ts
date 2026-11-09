import { loadCatalogPages } from './catalogPagination.ts'
import { apiClient } from './apiClient.ts'
import type {
  CatalogBrand,
  CatalogModel,
  CatalogPage,
} from '../types/deviceCatalog.ts'
function query(values: Record<string, string | undefined>) {
  return new URLSearchParams(
    Object.entries(values).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  ).toString()
}
export const deviceCatalogApi = {
  async brands(
    q = '',
    after?: string,
    signal?: AbortSignal,
  ): Promise<CatalogPage<CatalogBrand>> {
    const result = await loadCatalogPages<CatalogBrand>(
      (cursor) =>
        apiClient.get<CatalogPage<CatalogBrand>>(
          `/device-catalog/brands?${query({ q, after: cursor })}&limit=50`,
          { loading: 'dialog', signal, cacheTtlMs: 60 * 60 * 1000 },
        ),
      after,
      signal,
    )
    return {
      ...result,
      items: result.items.map((item) => ({
        ...item,
        name: item.name.toLocaleUpperCase('es'),
      })),
    }
  },
  models(brandId: string, q = '', after?: string, signal?: AbortSignal) {
    return loadCatalogPages<CatalogModel>(
      (cursor) =>
        apiClient.get<CatalogPage<CatalogModel>>(
          `/device-catalog/models?${query({ brandId, q, after: cursor })}&limit=50`,
          { loading: 'dialog', signal, cacheTtlMs: 60 * 60 * 1000 },
        ),
      after,
      signal,
    )
  },
}
