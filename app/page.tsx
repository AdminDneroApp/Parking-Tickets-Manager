import Link from 'next/link'
import { LayoutDashboard } from 'lucide-react'
import { TicketForm } from '@/features/ticket-form/TicketForm'
import { PageShell } from '@/shared/ui/PageShell'

export default function Home() {
  return (
    <PageShell
      subtitle="Registra tu ticket para el reembolso de parqueo ($1.50 por hora o fracción)."
      footerAction={
        <Link
          href="/dashboard"
          prefetch={false}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/40 px-3 py-1 text-xs text-muted-foreground/60 transition-colors hover:border-border hover:bg-card/80 hover:text-foreground"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Dashboard
        </Link>
      }
    >
      <TicketForm />
    </PageShell>
  )
}
