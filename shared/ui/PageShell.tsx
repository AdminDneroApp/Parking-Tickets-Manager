import Image from 'next/image'

/** Centered glass card with the DNERO background — used by the form and login pages. */
export function PageShell({
  subtitle,
  footerAction,
  children,
}: {
  subtitle: string
  footerAction?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <main className="relative flex min-h-[var(--app-vh)] flex-col items-center justify-center overflow-hidden px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="pointer-events-none fixed inset-0 bg-grid opacity-40" />
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[600px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-[460px]">
        <div className="glass-card card-shadow-md rounded-3xl p-5 sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center sm:mb-8">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-xl shadow-primary/15">
              <Image src="/assets/icons/iso-colors.svg" alt="DNERO" width={25} height={32} priority />
            </div>
            <h1 className="text-2xl font-bold">Tickets de parqueo</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>

      <div className="relative mt-8 flex flex-col items-center gap-2.5 text-sm text-muted-foreground/40">
        <p>DNERO · Uso interno · {new Date().getFullYear()}</p>
        {footerAction}
      </div>
    </main>
  )
}
