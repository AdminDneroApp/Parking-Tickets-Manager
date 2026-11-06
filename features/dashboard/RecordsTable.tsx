import { AlertTriangle, ExternalLink } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { formatDate, formatMoney } from '@/shared/lib/format'
import type { TicketRecord } from '@/types/ticket'

const MONEY_COLUMNS = ['Horas', 'Sub-Total', 'IVA', 'Total']

/**
 * Per-ticket table for the month. `personal` is the collaborator's own view: no
 * collaborator column, and no photo link (they may lack access to the Shared Drive).
 */
export function RecordsTable({ records, personal = false }: { records: TicketRecord[]; personal?: boolean }) {
  const headers = ['Fecha', ...(personal ? [] : ['Colaborador']), 'ID Ticket', 'Entrada', 'Salida', ...MONEY_COLUMNS, ...(personal ? [] : ['Foto'])]

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <h2 className="px-5 pt-5 text-sm font-semibold">Registros</h2>
      <div className="overflow-x-auto">
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b border-border">
              {headers.map((h) => (
                <th key={h} className={cn('px-4 py-2 font-medium', MONEY_COLUMNS.includes(h) && 'text-right')}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan={headers.length} className="px-4 py-8 text-center text-muted-foreground">
                  Sin registros este mes.
                </td>
              </tr>
            )}
            {records.map((r) => {
              const edited = r.hours !== r.calculatedHours
              return (
                <tr key={`${r.submittedAt}-${r.ticketId}`} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                  <td className="whitespace-nowrap px-4 py-2 tabular-nums">{formatDate(r.date)}</td>
                  {!personal && <td className="px-4 py-2">{r.email}</td>}
                  <td className="px-4 py-2 font-mono text-xs">{r.ticketId}</td>
                  <td className="px-4 py-2 tabular-nums">{r.entryTime}</td>
                  <td className="px-4 py-2 tabular-nums">{r.exitTime}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                    {edited && (
                      <span title={`Según el horario serían ${r.calculatedHours} h`} className="mr-1 inline-flex items-center gap-1 text-xs text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="sr-only">Difiere del horario</span>
                      </span>
                    )}
                    {r.hours}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(r.subtotal)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(r.iva)}</td>
                  <td className="px-4 py-2 text-right font-semibold tabular-nums">{formatMoney(r.total)}</td>
                  {!personal && (
                    <td className="px-4 py-2">
                      {r.photoUrl.startsWith('https://') && (
                        <a href={r.photoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                          Ver <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
