'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Loader2 } from 'lucide-react'

/** Month selector that reloads the current page with `?mes=YYYY-MM` as soon as it changes. */
export function MonthPicker({ month }: { month: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  return (
    <div className="space-y-1">
      <label htmlFor="mes" className="block text-xs font-medium text-muted-foreground">
        Mes y año
      </label>
      <div className="flex items-center gap-3">
        <input
          id="mes"
          name="mes"
          type="month"
          defaultValue={month}
          onChange={(e) => {
            const value = e.target.value
            // Cleared or partially typed values are empty/invalid — wait for a full month.
            if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return
            startTransition(() => router.push(`${pathname}?mes=${value}`))
          }}
          className="h-10 rounded-xl border border-border bg-card px-3 text-sm text-foreground"
        />
        {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Cargando" />}
      </div>
    </div>
  )
}
