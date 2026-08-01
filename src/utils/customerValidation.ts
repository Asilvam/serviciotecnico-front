const CUSTOMER_NAME_MAX_LENGTH = 120
const EMAIL_MAX_LENGTH = 254

export function normalizeCustomerName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-CL')
}

export function isValidCustomerName(value: string): boolean {
  const normalized = normalizeCustomerName(value)
  const letters = normalized.match(/\p{L}/gu)?.length ?? 0
  return (
    normalized.length >= 2 &&
    normalized.length <= CUSTOMER_NAME_MAX_LENGTH &&
    letters >= 2 &&
    !/[^\p{L}\p{M}\s.'’-]/u.test(normalized)
  )
}

export function normalizeCustomerEmail(value: string): string {
  return value.trim().toLocaleLowerCase('en-US')
}

export function isValidCustomerEmail(value: string): boolean {
  const normalized = normalizeCustomerEmail(value)
  return (
    normalized.length <= EMAIL_MAX_LENGTH &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)
  )
}

export function normalizeChileanMobile(value: string): string {
  let digits = value.replace(/\D/g, '')

  if (digits.length === 10 && digits.startsWith('09')) {
    digits = digits.slice(1)
  }
  if (digits.length === 9 && digits.startsWith('9')) {
    return `+56${digits}`
  }
  if (digits.length === 11 && digits.startsWith('569')) {
    return `+${digits}`
  }
  return value.trim()
}

export function isValidChileanMobile(value: string): boolean {
  return /^\+569\d{8}$/.test(normalizeChileanMobile(value))
}

export function formatChileanMobile(value: string): string {
  const normalized = normalizeChileanMobile(value)
  if (!isValidChileanMobile(normalized)) {
    return value.trim()
  }
  return `${normalized.slice(0, 3)} ${normalized.slice(3, 4)} ${normalized.slice(4, 8)} ${normalized.slice(8)}`
}
