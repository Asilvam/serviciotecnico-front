export function normalizeChileanRut(value: string): string {
  const compact = value.replace(/[^0-9kK]/g, '').toUpperCase()
  if (compact.length < 2) {
    return compact
  }

  const body = compact.slice(0, -1).replace(/^0+(?=\d)/, '')
  return `${body}-${compact.slice(-1)}`
}

export function formatChileanRut(value: string): string {
  const normalized = normalizeChileanRut(value)
  const match = /^(\d+)-([0-9K])$/.exec(normalized)
  if (!match) {
    return value.toUpperCase()
  }

  const [, body, checkDigit] = match
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formattedBody}-${checkDigit}`
}

export function isValidChileanRut(value: string): boolean {
  const normalized = normalizeChileanRut(value)
  const match = /^(\d{1,8})-([0-9K])$/.exec(normalized)
  if (!match) {
    return false
  }

  const [, body, providedCheckDigit] = match
  if (Number(body) === 0) {
    return false
  }

  let sum = 0
  let multiplier = 2
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }

  const result = 11 - (sum % 11)
  const expectedCheckDigit = result === 11 ? '0' : result === 10 ? 'K' : String(result)
  return providedCheckDigit === expectedCheckDigit
}
