import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { redirect } from 'next/navigation'
import { auth, signIn } from '@/auth'
import { isDashboardAdmin } from '@/shared/lib/admins'
import { Button } from '@/shared/ui/Button'
import { PageShell } from '@/shared/ui/PageShell'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const session = await auth()
  if (isDashboardAdmin(session?.user?.email)) redirect('/dashboard')

  return (
    <PageShell
      subtitle="Dashboard de administración"
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
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>Acceso restringido a administradores con cuenta @dneroapp.com.</span>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error === 'AccessDenied'
              ? 'Tu cuenta no tiene acceso al dashboard.'
              : 'No se pudo iniciar sesión. Intenta de nuevo.'}
          </div>
        )}

        <form
          action={async () => {
            'use server'
            await signIn('google', { redirectTo: '/dashboard' })
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
