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

export interface CollaboratorMonthRow {
  email: string
  name: string
  hours: number
  total: number
  ticketsByDate: Record<string, TicketRecord[]>
}

export interface CollaboratorWeek {
  number: number
  dates: string[]
}

const round2 = (n: number) => Math.round(n * 100) / 100

function displayName(email: string) {
  return (email.split('@')[0] ?? '')
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase('es-SV') + part.slice(1))
    .join(' ')
}

/** Daily ticket details grouped into one row per collaborator for the monthly export. */
export function summarizeCollaborators(records: TicketRecord[]) {
  const collaborators = new Map<string, CollaboratorMonthRow>()
  const dates = [...new Set(records.map((record) => record.date))].sort()

  for (const record of records) {
    const row = collaborators.get(record.email) ?? {
      email: record.email,
      name: displayName(record.email),
      hours: 0,
      total: 0,
      ticketsByDate: {},
    }
    row.hours += record.hours
    row.total += record.total
    const tickets = row.ticketsByDate[record.date] ?? []
    tickets.push(record)
    row.ticketsByDate[record.date] = tickets
    collaborators.set(record.email, row)
  }

  return {
    dates,
    collaborators: [...collaborators.values()]
      .map((row) => ({ ...row, total: round2(row.total) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es-SV') || a.email.localeCompare(b.email)),
  }
}

/** Monday-to-Saturday ranges that intersect the selected calendar month. */
export function weeksInMonth(month: string): CollaboratorWeek[] {
  const [year, monthNumber] = month.split('-').map(Number)
  const firstDay = new Date(Date.UTC(year, monthNumber - 1, 1))
  const lastDay = new Date(Date.UTC(year, monthNumber, 0))
  const mondayOffset = (firstDay.getUTCDay() + 6) % 7
  const weekStart = new Date(firstDay)
  weekStart.setUTCDate(firstDay.getUTCDate() - mondayOffset)

  const weeks: CollaboratorWeek[] = []
  while (weekStart <= lastDay) {
    const dates = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(weekStart)
      date.setUTCDate(weekStart.getUTCDate() + index)
      return date.toISOString().slice(0, 10)
    })
    if (dates[5] >= firstDay.toISOString().slice(0, 10)) {
      weeks.push({ number: weeks.length + 1, dates })
    }
    weekStart.setUTCDate(weekStart.getUTCDate() + 7)
  }

  return weeks
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
