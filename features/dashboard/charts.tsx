/**
 * Plain HTML/CSS charts — single series each, so one brand hue and no legend
 * (the card title names the measure). Hover shows a per-mark tooltip; the
 * tickets table below is the table view.
 */
import { formatMoney } from '@/shared/lib/format'
import type { CollaboratorTotal, DayTotal } from './summary'

/** Smallest "clean" axis max (1, 2, 5 × 10ⁿ) at or above the data max. */
function niceMax(value: number) {
  if (value <= 0) return 1
  const exp = 10 ** Math.floor(Math.log10(value))
  return ([1, 2, 5, 10].find((m) => m * exp >= value) ?? 10) * exp
}

const CHART_HEIGHT = 180

export function DailyColumns({ days }: { days: DayTotal[] }) {
  const max = niceMax(Math.max(...days.map((d) => d.total)))
  const ticks = [max, max / 2, 0]

  return (
    <div className="flex gap-2">
      {/* Y axis */}
      <div className="flex flex-col justify-between text-right text-[11px] tabular-nums text-muted-foreground" style={{ height: CHART_HEIGHT }}>
        {ticks.map((t) => (
          <span key={t} className="-translate-y-1/2 last:translate-y-1/2">{formatMoney(t)}</span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height: CHART_HEIGHT }}>
          {/* Hairline gridlines */}
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 h-px bg-border/70" style={{ bottom: `${(t / max) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {days.map((d) => {
              const day = Number(d.date.slice(8))
              return (
                <div key={d.date} className="group relative flex h-full flex-1 items-end justify-center">
                  {d.total > 0 && (
                    <div
                      className="w-full max-w-[24px] rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80"
                      style={{ height: `${(d.total / max) * 100}%` }}
                    />
                  )}
                  {/* Tooltip — the whole column slot is the hit target */}
                  <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-lg group-hover:block">
                    <div className="font-semibold">Día {day}</div>
                    <div className="tabular-nums text-muted-foreground">
                      {formatMoney(d.total)} · {d.hours} h
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        {/* X axis: label every 5th day to avoid collisions */}
        <div className="mt-1.5 flex gap-[2px] text-[11px] tabular-nums text-muted-foreground">
          {days.map((d) => {
            const day = Number(d.date.slice(8))
            return (
              <span key={d.date} className="flex-1 text-center">
                {day === 1 || day % 5 === 0 ? day : ''}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function CollaboratorBars({ rows }: { rows: CollaboratorTotal[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Sin registros este mes.</p>
  const max = Math.max(...rows.map((r) => r.total))

  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.email} className="group" title={`${r.email} · ${r.tickets} tickets · ${r.hours} h · ${formatMoney(r.total)}`}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="truncate">{r.email.split('@')[0]}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {r.tickets} {r.tickets === 1 ? 'ticket' : 'tickets'} · {r.hours} h
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 flex-1">
              <div
                className="h-full rounded-r-[4px] bg-primary transition-opacity group-hover:opacity-80"
                style={{ width: `${(r.total / max) * 100}%` }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">{formatMoney(r.total)}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}
