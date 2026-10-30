import Link from 'next/link'
import { AlertTriangle, ArrowLeft, ExternalLink, LogOut } from 'lucide-react'
import { auth, signOut } from '@/auth'
import { getGoogleConfig, readTickets } from '@/shared/lib/google'
import { todayIso } from '@/shared/lib/dates'
import { Button } from '@/shared/ui/Button'
import { cn } from '@/shared/lib/utils'
import { summarize, weeksInMonth } from '@/features/dashboard/summary'
import { CollaboratorBars, DailyColumns } from '@/features/dashboard/charts'
import { MonthlyCollaboratorTable } from '@/features/dashboard/MonthlyCollaboratorTable'
import { formatDate, formatMoney, formatMonth, formatNumber } from '@/shared/lib/format'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const session = await auth()
  const { mes } = await searchParams
  const currentMonth = todayIso().slice(0, 7)
  const month = mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : currentMonth

  const config = getGoogleConfig()
  let records: Awaited<ReturnType<typeof readTickets>> = []
  let loadError: string | null = config ? null : 'Google Sheets no está configurado (revisa las variables GOOGLE_*).'
  if (config) {
    try {
      records = await readTickets(config)
    } catch (err) {
      console.error('[dashboard] Failed to read sheet', err)
      loadError = 'No se pudo leer el Google Sheet.'
    }
  }

  const monthRecords = records
    .filter((r) => r.date.startsWith(month))
    .sort((a, b) => (b.date + b.entryTime).localeCompare(a.date + a.entryTime))
  const summary = summarize(monthRecords, month)
  const weeks = weeksInMonth(month)

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tickets de parqueo</h1>
          <p className="text-sm capitalize text-muted-foreground">{formatMonth(month)}</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="hidden sm:inline">{session?.user?.email}</span>
          <Button asChild variant="outline" size="sm">
            <Link href="/">
              <ArrowLeft className="h-3.5 w-3.5" /> Formulario
            </Link>
          </Button>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              <LogOut className="h-3.5 w-3.5" /> Salir
            </Button>
          </form>
        </div>
      </header>

      <form action="/dashboard" method="get" className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="mes" className="block text-xs font-medium text-muted-foreground">
            Mes y año
          </label>
          <input
            id="mes"
            name="mes"
            type="month"
            defaultValue={month}
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm text-foreground"
          />
        </div>
        <Button type="submit" variant="outline" className="h-10">
          Ver resumen
        </Button>
      </form>

      <MonthlyCollaboratorTable
        weeks={weeks}
        records={records}
        monthHours={summary.hours}
        monthTotal={summary.total}
      />

      {loadError && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {loadError}
        </div>
      )}

      {/* KPIs */}
      <section className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Total a reembolsar</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums sm:text-5xl">{formatMoney(summary.total)}</p>
          <p className="mt-2 text-sm tabular-nums text-muted-foreground">
            Sub-Total {formatMoney(summary.subtotal)} · IVA 13% {formatMoney(summary.iva)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:col-span-2 md:grid-cols-4">
          <Stat label="Tickets" value={summary.tickets} />
          <Stat label="Horas" value={summary.hours} />
          <Stat label="Colaboradores" value={summary.byCollaborator.length} />
          <Stat label="Horas editadas" value={summary.editedHours} hint="Tickets donde las horas difieren del cálculo" />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Total por día</h2>
          <DailyColumns days={summary.byDay} />
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Total por colaborador</h2>
          <CollaboratorBars rows={summary.byCollaborator} />
        </div>
      </section>

      {/* Table view */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <h2 className="px-5 pt-5 text-sm font-semibold">Registros</h2>
        <div className="overflow-x-auto">
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b border-border">
                {['Fecha', 'Colaborador', 'ID Ticket', 'Entrada', 'Salida', 'Horas', 'Sub-Total', 'IVA', 'Total', 'Foto'].map((h) => (
                  <th key={h} className={cn('px-4 py-2 font-medium', ['Horas', 'Sub-Total', 'IVA', 'Total'].includes(h) && 'text-right')}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthRecords.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                    Sin registros este mes.
                  </td>
                </tr>
              )}
              {monthRecords.map((r) => {
                const edited = r.hours !== r.calculatedHours
                return (
                  <tr key={`${r.submittedAt}-${r.ticketId}`} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums">{formatDate(r.date)}</td>
                    <td className="px-4 py-2">{r.email}</td>
                    <td className="px-4 py-2 font-mono text-xs">{r.ticketId}</td>
                    <td className="px-4 py-2 tabular-nums">{r.entryTime}</td>
                    <td className="px-4 py-2 tabular-nums">{r.exitTime}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                      {edited && (
                        <span title={`Editado — el cálculo da ${r.calculatedHours} h`} className="mr-1 inline-flex items-center gap-1 text-xs text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          <span className="sr-only">Editado</span>
                        </span>
                      )}
                      {r.hours}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatMoney(r.subtotal)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatMoney(r.iva)}</td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums">{formatMoney(r.total)}</td>
                    <td className="px-4 py-2">
                      {r.photoUrl.startsWith('https://') && (
                        <a href={r.photoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                          Ver <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4" title={hint}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{formatNumber(value)}</p>
    </div>
  )
}
