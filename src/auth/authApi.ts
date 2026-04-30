export type LoginPayload = {
  email: string
  password: string
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
  const baseUrl = import.meta.env.VITE_SERVER_URL
  const url = `${baseUrl}/auth/login`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const body = (await response.json().catch(() => ({}))) as LoginApiResponse

  if (!response.ok) {
    throw new Error(body.message ?? 'No fue posible iniciar sesion.')
  }

  const token = extractToken(body)
  if (!token) {
    throw new Error('Respuesta de autenticacion invalida: token ausente.')
  }

  return token
}

