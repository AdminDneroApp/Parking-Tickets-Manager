import Link from 'next/link'
import { AlertTriangle, ArrowLeft, LogOut } from 'lucide-react'
import { redirect } from 'next/navigation'
import { MY_TICKETS_LOGIN, auth, signOut } from '@/auth'
import { getGoogleConfig, readTickets } from '@/shared/lib/google'
import { todayIso } from '@/shared/lib/dates'
import { isCompanyEmail } from '@/shared/lib/validation'
import { Button } from '@/shared/ui/Button'
import { summarize, weeksInMonth } from '@/features/dashboard/summary'
import { MonthlyCollaboratorTable } from '@/features/dashboard/MonthlyCollaboratorTable'
import { MonthPicker } from '@/features/dashboard/MonthPicker'
import { RecordsTable } from '@/features/dashboard/RecordsTable'
import { formatMonth } from '@/shared/lib/format'

export const dynamic = 'force-dynamic'

/**
 * Collaborator's own tickets. The email always comes from the session, never from
 * the URL, so nobody can read someone else's rows.
 */
export default async function MyTicketsPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const session = await auth()
  const email = session?.user?.email?.toLowerCase() ?? ''
  // proxy.ts already guards this route; re-check so the filter below never runs without a valid email.
  if (!isCompanyEmail(email)) redirect(MY_TICKETS_LOGIN)

  const { mes } = await searchParams
  const currentMonth = todayIso().slice(0, 7)
  const month = mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : currentMonth

  const config = getGoogleConfig()
  let records: Awaited<ReturnType<typeof readTickets>> = []
  let loadError: string | null = config ? null : 'El registro de tickets no está configurado.'
  if (config) {
    try {
      records = (await readTickets(config)).filter((r) => r.email.toLowerCase() === email)
    } catch (err) {
      console.error('[mis-tickets] Failed to read sheet', err)
      loadError = 'No se pudieron cargar tus tickets. Intenta de nuevo en unos minutos.'
    }
  }

  const monthRecords = records
    .filter((r) => r.date.startsWith(month))
    .sort((a, b) => (b.date + b.entryTime).localeCompare(a.date + a.entryTime))
  const summary = summarize(monthRecords, month)

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mis tickets</h1>
          <p className="text-sm capitalize text-muted-foreground">{formatMonth(month)}</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="hidden sm:inline">{email}</span>
          <Button asChild variant="outline" size="sm">
            <Link href="/">
              <ArrowLeft className="h-3.5 w-3.5" /> Formulario
            </Link>
          </Button>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: MY_TICKETS_LOGIN })
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              <LogOut className="h-3.5 w-3.5" /> Salir
            </Button>
          </form>
        </div>
      </header>

      <MonthPicker month={month} />

      {loadError && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {loadError}
        </div>
      )}

      <MonthlyCollaboratorTable
        key={month}
        weeks={weeksInMonth(month)}
        records={records}
        monthHours={summary.hours}
        monthTotal={summary.total}
        personal
      />

      <RecordsTable records={monthRecords} personal />
    </main>
  )
}
