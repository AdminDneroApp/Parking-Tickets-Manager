import type { TicketRecord } from '@/types/ticket'

export interface CollaboratorTotal {
  email: string
  tickets: number
  hours: number
  total: number
}

export interface DayTotal {
  /** YYYY-MM-DD */
  date: string
  hours: number
  total: number
}

export interface MonthSummary {
  tickets: number
  hours: number
  subtotal: number
  iva: number
  total: number
  editedHours: number
  byCollaborator: CollaboratorTotal[]
  /** Every day of the month, including days with no tickets. */
  byDay: DayTotal[]
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** YYYY-MM values present in the data, newest first. */
export function availableMonths(records: TicketRecord[], current: string): string[] {
  const months = new Set(records.map((r) => r.date.slice(0, 7)).filter((m) => /^\d{4}-\d{2}$/.test(m)))
  months.add(current)
  return [...months].sort().reverse()
}

export function summarize(records: TicketRecord[], month: string): MonthSummary {
  const byEmail = new Map<string, CollaboratorTotal>()
  const [year, mon] = month.split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(year, mon, 0)).getUTCDate()
  const byDay: DayTotal[] = Array.from({ length: daysInMonth }, (_, i) => ({
    date: `${month}-${String(i + 1).padStart(2, '0')}`,
    hours: 0,
    total: 0,
  }))

  let hours = 0
  let subtotal = 0
  let iva = 0
  let total = 0
  let editedHours = 0

  for (const r of records) {
    hours += r.hours
    subtotal += r.subtotal
    iva += r.iva
    total += r.total
    if (r.hours !== r.calculatedHours) editedHours++

    const c = byEmail.get(r.email) ?? { email: r.email, tickets: 0, hours: 0, total: 0 }
    c.tickets++
    c.hours += r.hours
    c.total = round2(c.total + r.total)
    byEmail.set(r.email, c)

    const day = byDay[Number(r.date.slice(8, 10)) - 1]
    if (day) {
      day.hours += r.hours
      day.total = round2(day.total + r.total)
    }
  }

  return {
    tickets: records.length,
    hours,
    subtotal: round2(subtotal),
    iva: round2(iva),
    total: round2(total),
    editedHours,
    byCollaborator: [...byEmail.values()].sort((a, b) => b.total - a.total),
    byDay,
  }
}
