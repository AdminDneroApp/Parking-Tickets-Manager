/**
 * Parking pricing. The hourly rate already includes IVA; the accounting
 * breakdown backs the tax out of the total. All math runs in cents so the
 * split always adds up (e.g. 9 h → 1350 = 1195 + 155).
 */

import { formatMoney } from './format'

/** $1.50 per hour or fraction, IVA included. */
export const HOURLY_RATE_CENTS = 150
export const IVA_RATE = 0.13

export const MAX_HOURS = 24

export interface Breakdown {
  totalCents: number
  subtotalCents: number
  ivaCents: number
}

export function breakdown(hours: number): Breakdown {
  const totalCents = hours * HOURLY_RATE_CENTS
  const subtotalCents = Math.round(totalCents / (1 + IVA_RATE))
  return { totalCents, subtotalCents, ivaCents: totalCents - subtotalCents }
}

/** "HH:MM" → minutes since midnight, or null if malformed. */
export function parseTime(value: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/** Billable hours: every started hour counts as a full hour. Null when exit is not after entry. */
export function billableHours(entry: string, exit: string): number | null {
  const start = parseTime(entry)
  const end = parseTime(exit)
  if (start === null || end === null || end <= start) return null
  return Math.ceil((end - start) / 60)
}

export const cents = (value: number) => value / 100

export const formatUsd = (valueCents: number) => formatMoney(cents(valueCents))
