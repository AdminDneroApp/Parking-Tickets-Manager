import { TicketForm } from '@/features/ticket-form/TicketForm'
import { PageShell } from '@/shared/ui/PageShell'

export default function Home() {
  return (
    <PageShell subtitle="Registra tu ticket para el reembolso de parqueo ($1.50 por hora o fracción).">
      <TicketForm />
    </PageShell>
  )
}
