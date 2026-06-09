import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { getSession } from '../auth/session.ts'

type RequestOptions = {
  headers?: Record<string, string>
  requiresAuth?: boolean
  bypassCache?: boolean
}

console.log('API Client: VITE_SERVER_URL es', import.meta.env.VITE_SERVER_URL)

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL || 'http://localhost:3500',
})

// Interceptamos peticiones para inyectar automáticamente el Bearer token si no se desactiva
axiosInstance.interceptors.request.use(
  (config) => {
    // Si la petición tiene un flag personalizado requiresAuth en la configuración, lo leemos
    const requiresAuth = (config as AxiosRequestConfig & { requiresAuth?: boolean }).requiresAuth ?? true
    if (requiresAuth) {
      const session = getSession()
      if (session?.token) {
        config.headers.Authorization = `Bearer ${session.token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptamos respuestas para formatear el mensaje de error de forma consistente
axiosInstance.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    const errorBody = error.response?.data as { message?: string } | undefined
    const message = errorBody?.message ?? error.message ?? 'Ocurrio un error al procesar la solicitud.'
    return Promise.reject(new Error(message))
  }
)

interface CacheEntry {
  data: any
  expiresAt: number
}

const getCache = new Map<string, CacheEntry>()
const CACHE_TTL = 30000 // 30 segundos de duración del caché

function invalidateCache(path: string) {
  const segments = path.split('/').filter(Boolean)
  if (segments.length === 0) return
  const baseResource = `/${segments[0]}`
  
  for (const key of getCache.keys()) {
    if (key.startsWith(baseResource)) {
      getCache.delete(key)
    }
  }
}

export const apiClient = {
  async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const now = Date.now()
    if (!options.bypassCache) {
      const cached = getCache.get(path)
      if (cached && cached.expiresAt > now) {
        return cached.data as T
      }
    }

    const config: AxiosRequestConfig & { requiresAuth?: boolean } = {
      headers: options.headers,
      requiresAuth: options.requiresAuth,
    }
    const response = await axiosInstance.get<T>(path, config)
    getCache.set(path, { data: response.data, expiresAt: now + CACHE_TTL })
    return response.data
  },

  async post<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    invalidateCache(path)
    const config: AxiosRequestConfig & { requiresAuth?: boolean } = {
      headers: options.headers,
      requiresAuth: options.requiresAuth,
    }
    const response = await axiosInstance.post<T>(path, body, config)
    return response.data
  },

  async patch<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    invalidateCache(path)
    const config: AxiosRequestConfig & { requiresAuth?: boolean } = {
      headers: options.headers,
      requiresAuth: options.requiresAuth,
    }
    const response = await axiosInstance.patch<T>(path, body, config)
    return response.data
  },

  async delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    invalidateCache(path)
    const config: AxiosRequestConfig & { requiresAuth?: boolean } = {
      headers: options.headers,
      requiresAuth: options.requiresAuth,
    }
    const response = await axiosInstance.delete<T>(path, config)
    return response.data
  },
}
