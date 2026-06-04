import { apiClient } from '../api/apiClient.ts'

export type LoginPayload = {
  email: string
  password: string
}

export type ProfileResponse = {
  id?: string
  _id?: string
  email: string
  name: string
  role?: string
  isActive?: boolean
}

type LoginApiResponse = {
  accessToken?: string
  token?: string
  data?: {
    accessToken?: string
    token?: string
  }
  message?: string
}

function extractToken(response: LoginApiResponse): string | null {
  return response.accessToken ?? response.token ?? response.data?.accessToken ?? response.data?.token ?? null
}

export async function loginRequest(payload: LoginPayload): Promise<string> {
  const body = await apiClient.post<LoginApiResponse>('/auth/login', payload, {
    requiresAuth: false,
  })

  const token = extractToken(body)
  if (!token) {
    throw new Error('Respuesta de autenticacion invalida: token ausente.')
  }

  return token
}

export async function getProfileRequest(token: string): Promise<ProfileResponse> {
  return apiClient.get<ProfileResponse>('/auth/profile', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    requiresAuth: false,
  })
}
