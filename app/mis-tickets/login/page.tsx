import Link from 'next/link'
import { ArrowLeft, Ticket } from 'lucide-react'
import { redirect } from 'next/navigation'
import { auth, signIn } from '@/auth'
import { isCompanyEmail } from '@/shared/lib/validation'
import { Button } from '@/shared/ui/Button'
import { PageShell } from '@/shared/ui/PageShell'

/** Collaborator sign-in — any verified @dneroapp.com account, unlike the admin /login. */
export default async function MyTicketsLoginPage() {
  const session = await auth()
  if (isCompanyEmail(session?.user?.email ?? '')) redirect('/mis-tickets')

  return (
    <PageShell
      subtitle="Consulta los tickets que has registrado"
      footerAction={
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/40 px-3 py-1 text-xs text-muted-foreground/60 transition-colors hover:border-border hover:bg-card/80 hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver al formulario
        </Link>
      }
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>Inicia sesión con tu cuenta @dneroapp.com para ver tus tickets por semana.</span>
        </div>

        <form
          action={async () => {
            'use server'
            await signIn('google', { redirectTo: '/mis-tickets' })
          }}
        >
          <Button type="submit" className="h-11 w-full rounded-xl font-bold">
            Continuar con Google
          </Button>
        </form>
      </div>
    </PageShell>
  )
}
