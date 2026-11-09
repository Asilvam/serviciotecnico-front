import { loadCatalogPages } from './catalogPagination.ts'
import { apiClient } from './apiClient.ts'
import { startLoadingAlert } from '../ui/loadingAlert.ts'
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
/** Keep all cursor pages under one alert, starting only on an HTTP cache miss. */
async function catalogPages<T extends { id: string }>(
  path: (cursor?: string) => string,
  title: string,
  after?: string,
  signal?: AbortSignal,
): Promise<CatalogPage<T>> {
  let finish: (() => void) | undefined
  try {
    return await loadCatalogPages<T>(
      cursor => apiClient.get<CatalogPage<T>>(path(cursor), {
        loading: 'silent', signal, cacheTtlMs: 60 * 60 * 1000,
        onNetworkStart: () => { finish ??= startLoadingAlert(title) },
      }),
      after,
      signal,
    )
  } finally {
    finish?.()
  }
}

export const deviceCatalogApi = {
  async brands(
    q = '',
    after?: string,
    signal?: AbortSignal,
  ): Promise<CatalogPage<CatalogBrand>> {
    const result = await catalogPages<CatalogBrand>(
      cursor => `/device-catalog/brands?${query({ q, after: cursor })}&limit=50`,
      'Cargando marcas…', after, signal,
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
    return catalogPages<CatalogModel>(
      cursor => `/device-catalog/models?${query({ brandId, q, after: cursor })}&limit=50`,
      'Cargando modelos…', after, signal,
    )
  },
}
