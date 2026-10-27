'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { formatMoney } from '@/shared/lib/format'
import type { TicketRecord } from '@/types/ticket'
import { summarizeCollaborators, type CollaboratorWeek } from './summary'

function formatShortDate(isoDate: string) {
  return `${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}/${isoDate.slice(2, 4)}`
}

function formatWeekday(isoDate: string) {
  return new Intl.DateTimeFormat('es-SV', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`))
}

function formatTime(time: string) {
  const [hourPart, minutePart] = time.split(':')
  const hour = Number(hourPart)
  const minute = Number(minutePart)
  const clock = `${hour % 12 || 12}${minute ? `:${String(minute).padStart(2, '0')}` : ''}`
  return `${clock} ${hour < 12 ? 'AM' : 'PM'}`
}

function formatTicket(date: string, entryTime: string, exitTime: string) {
  return `${formatShortDate(date)} (${formatTime(entryTime)} a ${formatTime(exitTime)})`
}

export function MonthlyCollaboratorTable({
  weeks,
  records,
  monthHours,
  monthTotal,
}: {
  weeks: CollaboratorWeek[]
  records: TicketRecord[]
  monthHours: number
  monthTotal: number
}) {
  const [selectedWeek, setSelectedWeek] = useState(0)
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)
  const [copyError, setCopyError] = useState<string | null>(null)
  const activeWeekIndex = Math.min(selectedWeek, weeks.length - 1)
  const week = weeks[activeWeekIndex]
  const weekRecords = week
    ? records.filter((record) => record.date >= week.dates[0] && record.date <= week.dates[5])
    : []
  const { collaborators } = summarizeCollaborators(weekRecords)
  const weekHours = weekRecords.reduce((sum, record) => sum + record.hours, 0)
  const weekTotal = weekRecords.reduce((sum, record) => sum + Math.round(record.total * 100), 0) / 100

  if (!week) return null

  async function copyRow(row: (typeof collaborators)[number]) {
    const dailyValues = week.dates.map((date) =>
      (row.ticketsByDate[date] ?? [])
        .map((ticket) => formatTicket(date, ticket.entryTime, ticket.exitTime))
        .join(' | '),
    )
    const values = [row.name, ...dailyValues, `${row.hours} horas (${formatMoney(row.total)})`]

    try {
      await navigator.clipboard.writeText(values.join('\t'))
      setCopiedEmail(row.email)
      setCopyError(null)
    } catch {
      setCopiedEmail(null)
      setCopyError('No se pudieron copiar los datos. Revisa los permisos del navegador.')
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5">
        <div>
          <h2 className="text-sm font-semibold">Resumen semanal por colaborador</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Semana de {formatShortDate(week.dates[0])} a {formatShortDate(week.dates[5])}. Cada fila se copia en formato tabulado para Google Sheets.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {collaborators.length} {collaborators.length === 1 ? 'colaborador' : 'colaboradores'}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 px-5 pt-4">
        <nav aria-label="Seleccionar semana" className="flex flex-wrap gap-2">
          {weeks.map((item, index) => (
            <Button
              key={item.number}
              type="button"
              size="sm"
              variant={index === activeWeekIndex ? 'default' : 'outline'}
              aria-pressed={index === activeWeekIndex}
              onClick={() => {
                setSelectedWeek(index)
                setCopiedEmail(null)
                setCopyError(null)
              }}
            >
              Semana {item.number}
            </Button>
          ))}
        </nav>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Total semana: </span>
            <span className="font-semibold tabular-nums">{weekHours} horas · {formatMoney(weekTotal)}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Total del mes: </span>
            <span className="font-semibold tabular-nums">{monthHours} horas · {formatMoney(monthTotal)}</span>
          </p>
        </div>
      </div>

      {copyError && (
        <p role="alert" className="mx-5 mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {copyError}
        </p>
      )}
      {copiedEmail && (
        <p role="status" className="sr-only">
          Datos de {collaborators.find((row) => row.email === copiedEmail)?.name} copiados.
        </p>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-y border-border">
              <th className="sticky left-0 z-10 bg-card px-4 py-3 font-medium">Nombre</th>
              {week.dates.map((date) => (
                <th key={date} className="min-w-36 px-3 py-2 text-center font-medium">
                  <span className="block capitalize">{formatWeekday(date)}</span>
                  <span className="block tabular-nums">{formatShortDate(date)}</span>
                </th>
              ))}
              <th className="whitespace-nowrap px-4 py-3 text-right font-medium">Total semana</th>
              <th className="sticky right-0 z-10 bg-card px-4 py-3 text-center font-medium">Copiar</th>
            </tr>
          </thead>
          <tbody>
            {collaborators.length === 0 ? (
              <tr>
                <td colSpan={week.dates.length + 3} className="px-4 py-8 text-center text-muted-foreground">
                  Sin registros esta semana.
                </td>
              </tr>
            ) : (
              collaborators.map((row) => {
                return (
                  <tr key={row.email} className="border-b border-border/60 last:border-0 hover:bg-accent/30">
                  <th scope="row" className="sticky left-0 z-10 whitespace-nowrap bg-card px-4 py-3 text-left font-medium">
                    {row.name}
                  </th>
                  {week.dates.map((date) => {
                    const tickets = row.ticketsByDate[date] ?? []
                    return (
                      <td key={date} className="px-3 py-2 text-center text-xs tabular-nums">
                        {tickets.length > 0 ? (
                          <div className="space-y-1">
                            {tickets.map((ticket) => (
                              <div key={`${ticket.submittedAt}-${ticket.ticketId}`}>
                                {formatTicket(date, ticket.entryTime, ticket.exitTime)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">
                    {row.hours} horas ({formatMoney(row.total)})
                  </td>
                  <td className="sticky right-0 z-10 bg-card px-4 py-2 text-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Copiar resumen de ${row.name}`}
                      onClick={() => void copyRow(row)}
                    >
                      {copiedEmail === row.email ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedEmail === row.email ? 'Copiado' : 'Copiar'}
                    </Button>
                  </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
