export const CHILE_TIME_ZONE = 'America/Santiago'

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

export function formatChileDate(value?: string, fallback = 'Sin fecha'): string {
  const parsed = parseDate(value)
  if (!parsed) return value || fallback

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeZone: CHILE_TIME_ZONE,
  }).format(parsed)
}

export function formatChileDateTime(value?: string, fallback = 'Sin fecha informada'): string {
  const parsed = parseDate(value)
  if (!parsed) return value || fallback

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: CHILE_TIME_ZONE,
  }).format(parsed)
}

export function toCalendarDateInput(value?: string): string {
  if (!value) return ''
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value)
  return match?.[1] ?? ''
}

export function formatChileCalendarDate(
  value?: string,
  fallback = 'Sin fecha informada',
): string {
  const calendarDate = toCalendarDateInput(value)
  if (!calendarDate) return value || fallback

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${calendarDate}T00:00:00.000Z`))
}
