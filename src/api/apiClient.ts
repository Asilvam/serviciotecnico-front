import { getSession } from '../auth/session.ts'

type ApiErrorResponse = {
  message?: string
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

function resolveBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_SERVER_URL
  if (!baseUrl) {
    throw new Error('No se encontro VITE_SERVER_URL configurado.')
  }
  return baseUrl
}

function resolveAuthToken(): string {
  const session = getSession()
  if (!session?.token) {
    throw new Error('No hay sesion activa. Inicia sesion para continuar.')
  }
  return session.token
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  if (!text) {
    return undefined as T
  }
  return JSON.parse(text) as T
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = resolveBaseUrl()
  const token = resolveAuthToken()
  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${token}`)

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    const errorBody = await parseResponse<ApiErrorResponse>(response).catch(
      (): ApiErrorResponse => ({}),
    )
    const message = errorBody?.message ?? 'Ocurrio un error al procesar la solicitud.'
    throw new Error(message)
  }

  return parseResponse<T>(response)
}

export const apiClient = {
  get<T>(path: string) {
    return request<T>(path, { method: 'GET' })
  },
  post<T>(path: string, body: unknown) {
    return request<T>(path, { method: 'POST', body })
  },
  patch<T>(path: string, body: unknown) {
    return request<T>(path, { method: 'PATCH', body })
  },
  delete<T>(path: string) {
    return request<T>(path, { method: 'DELETE' })
  },
}
