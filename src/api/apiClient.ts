import axios, { type AxiosRequestConfig } from 'axios'
import { getSession } from '../auth/session.ts'

type RequestOptions = {
  headers?: Record<string, string>
  requiresAuth?: boolean
}

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL,
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

export const apiClient = {
  async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const config: AxiosRequestConfig & { requiresAuth?: boolean } = {
      headers: options.headers,
      requiresAuth: options.requiresAuth,
    }
    const response = await axiosInstance.get<T>(path, config)
    return response.data
  },

  async post<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    const config: AxiosRequestConfig & { requiresAuth?: boolean } = {
      headers: options.headers,
      requiresAuth: options.requiresAuth,
    }
    const response = await axiosInstance.post<T>(path, body, config)
    return response.data
  },

  async patch<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    const config: AxiosRequestConfig & { requiresAuth?: boolean } = {
      headers: options.headers,
      requiresAuth: options.requiresAuth,
    }
    const response = await axiosInstance.patch<T>(path, body, config)
    return response.data
  },

  async delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const config: AxiosRequestConfig & { requiresAuth?: boolean } = {
      headers: options.headers,
      requiresAuth: options.requiresAuth,
    }
    const response = await axiosInstance.delete<T>(path, config)
    return response.data
  },
}
