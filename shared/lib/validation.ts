/**
 * Ticket validation shared by the form (instant feedback) and the API route
 * (the source of truth — the form is public, never trust the client).
 */
import type { TicketInput } from '@/types/ticket'
import { MAX_HOURS, billableHours, parseTime } from './pricing'

export const COMPANY_DOMAIN = 'dneroapp.com'

export const PHOTO_MAX_BYTES = 4 * 1024 * 1024
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

const EMAIL_RE = /^[a-z0-9._%+-]+@([a-z0-9-]+\.)+[a-z]{2,}$/
const TICKET_ID_RE = /^[A-Za-z0-9-]{1,40}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export type TicketErrors = Partial<Record<keyof TicketInput | 'photo', string>>

export function isCompanyEmail(email: string) {
  const normalized = email.trim().toLowerCase()
  return EMAIL_RE.test(normalized) && normalized.endsWith(`@${COMPANY_DOMAIN}`)
}

/** `today` is YYYY-MM-DD in the caller's timezone (dates in the future are rejected). */
export function validateTicket(input: TicketInput, today: string): TicketErrors {
  const errors: TicketErrors = {}

  if (!isCompanyEmail(input.email)) errors.email = `Usa tu correo @${COMPANY_DOMAIN}.`
  if (!TICKET_ID_RE.test(input.ticketId.trim())) {
    errors.ticketId = 'Solo letras, números y guiones (máx. 40).'
  }

  if (!DATE_RE.test(input.date) || Number.isNaN(Date.parse(input.date))) {
    errors.date = 'Fecha inválida.'
  } else if (input.date > today) {
    errors.date = 'La fecha no puede ser futura.'
  }

  if (parseTime(input.entryTime) === null) errors.entryTime = 'Hora inválida.'
  if (parseTime(input.exitTime) === null) errors.exitTime = 'Hora inválida.'
  else if (!errors.entryTime && billableHours(input.entryTime, input.exitTime) === null) {
    errors.exitTime = 'La salida debe ser posterior a la entrada.'
  }

  // Hours are derived from the times — only check them once the times are valid
  if (!errors.entryTime && !errors.exitTime) {
    if (!Number.isInteger(input.hours) || input.hours < 1 || input.hours > MAX_HOURS) {
      errors.hours = `Las horas deben estar entre 1 y ${MAX_HOURS}.`
    }
  }

  return errors
}

export function validatePhoto(file: { size: number; type: string } | null): string | undefined {
  if (!file || file.size === 0) return 'Adjunta una foto del ticket.'
  if (!PHOTO_TYPES.includes(file.type)) return 'Formato no soportado (usa JPG, PNG o WEBP).'
  if (file.size > PHOTO_MAX_BYTES) return 'La foto supera 4 MB.'
}
