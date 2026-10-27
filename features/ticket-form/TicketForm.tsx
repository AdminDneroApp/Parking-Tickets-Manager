'use client'

import { useEffect, useMemo, useState } from 'react'
import { Camera, CheckCircle2, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Field } from '@/shared/ui/Field'
import { HOURLY_RATE_CENTS, MAX_HOURS, billableHours, breakdown, formatUsd } from '@/shared/lib/pricing'
import { todayIso } from '@/shared/lib/dates'
import { type TicketErrors, PHOTO_TYPES, validatePhoto, validateTicket } from '@/shared/lib/validation'
import { compressImage } from './compress-image'

const EMAIL_STORAGE_KEY = 'parking.email'

const inputClass =
  'h-11 rounded-xl bg-muted/60 px-4 placeholder:text-muted-foreground/60 focus-visible:border-primary/60 focus-visible:ring-primary/20'

export function TicketForm() {
  /** Set after mount: the page is prerendered, "today" must come from the browser. */
  const [today, setToday] = useState('')
  const [email, setEmail] = useState('')
  const [ticketId, setTicketId] = useState('')
  const [date, setDate] = useState('')
  const [entryTime, setEntryTime] = useState('')
  const [exitTime, setExitTime] = useState('')
  /** Null while the collaborator keeps the calculated value. */
  const [hoursOverride, setHoursOverride] = useState<string | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const [errors, setErrors] = useState<TicketErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Browser-only values. The email is remembered between visits — it's the same person every time.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage and the local date exist only after mount */
    const now = todayIso()
    setToday(now)
    setDate(now)
    setEmail(localStorage.getItem(EMAIL_STORAGE_KEY) ?? '')
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  const calculatedHours = billableHours(entryTime, exitTime)
  const hoursValue = hoursOverride ?? (calculatedHours ? String(calculatedHours) : '')
  const hours = Number(hoursValue)
  const isEdited = hoursOverride !== null && calculatedHours !== null && hours !== calculatedHours

  const amounts = useMemo(
    () => (Number.isInteger(hours) && hours > 0 && hours <= MAX_HOURS ? breakdown(hours) : null),
    [hours],
  )

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErrors((prev) => ({ ...prev, photo: undefined }))
    const compressed = await compressImage(file)
    setPhoto(compressed)
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(compressed)
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const input = { email: email.trim().toLowerCase(), ticketId: ticketId.trim(), date, entryTime, exitTime, hours }
    const nextErrors = validateTicket(input, today)
    const photoError = validatePhoto(photo)
    if (photoError) nextErrors.photo = photoError
    setErrors(nextErrors)
    setFormError(null)
    if (Object.keys(nextErrors).length > 0 || !photo) return

    const body = new FormData(e.currentTarget)
    body.set('hours', String(hours))
    body.set('photo', photo)

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/tickets', { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.errors) setErrors(data.errors)
        setFormError(data.error ?? 'Revisa los campos marcados.')
        return
      }
      localStorage.setItem(EMAIL_STORAGE_KEY, input.email)
      setSubmitted(true)
    } catch {
      setFormError('Sin conexión. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function reset() {
    setTicketId('')
    setDate(today)
    setEntryTime('')
    setExitTime('')
    setHoursOverride(null)
    setPhoto(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    setErrors({})
    setFormError(null)
    setSubmitted(false)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        <div>
          <h2 className="text-xl font-bold">Ticket registrado</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {ticketId.toUpperCase()} · {hours} h · {amounts && formatUsd(amounts.totalCents)}
          </p>
        </div>
        <Button onClick={reset} className="h-11 w-full rounded-xl">
          Registrar otro ticket
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Honeypot — hidden from people, bots fill it */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <Field id="email" label="Correo del colaborador" error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="nombre@dneroapp.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field id="ticketId" label="ID del ticket" error={errors.ticketId}>
        <Input
          id="ticketId"
          name="ticketId"
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="Ej. 0012345"
          value={ticketId}
          onChange={(e) => setTicketId(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field id="date" label="Fecha" error={errors.date}>
        <Input
          id="date"
          name="date"
          type="date"
          max={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field id="entryTime" label="Hora de entrada" error={errors.entryTime}>
          <Input
            id="entryTime"
            name="entryTime"
            type="time"
            value={entryTime}
            onChange={(e) => {
              setEntryTime(e.target.value)
              setHoursOverride(null)
            }}
            className={inputClass}
          />
        </Field>
        <Field id="exitTime" label="Hora de salida" error={errors.exitTime}>
          <Input
            id="exitTime"
            name="exitTime"
            type="time"
            value={exitTime}
            onChange={(e) => {
              setExitTime(e.target.value)
              setHoursOverride(null)
            }}
            className={inputClass}
          />
        </Field>
      </div>

      <Field
        id="hours"
        label="Cantidad de horas"
        hint="Se calcula automáticamente; cada fracción cuenta como hora completa."
        error={errors.hours}
      >
        <div className="flex items-center gap-2">
          <Input
            id="hours"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_HOURS}
            step={1}
            value={hoursValue}
            onChange={(e) => setHoursOverride(e.target.value)}
            className={inputClass}
          />
          {isEdited && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              title={`Volver al cálculo (${calculatedHours} h)`}
              onClick={() => setHoursOverride(null)}
              className="h-11 w-11 shrink-0 rounded-xl"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
        {isEdited && (
          <p className="text-xs text-amber-400">Editado manualmente — el cálculo da {calculatedHours} h.</p>
        )}
      </Field>

      <Field id="photo" label="Foto del ticket" error={errors.photo}>
        <label
          htmlFor="photo"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground transition-colors hover:border-primary/60"
        >
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
            <img src={photoPreview} alt="Vista previa del ticket" className="max-h-56 rounded-lg object-contain" />
          ) : (
            <>
              <Camera className="h-6 w-6 text-primary" />
              <span>Toma o adjunta una foto</span>
            </>
          )}
          {photoPreview && <span className="text-xs">Toca para cambiarla</span>}
        </label>
        <input
          id="photo"
          type="file"
          accept={PHOTO_TYPES.join(',')}
          onChange={handlePhoto}
          className="sr-only"
        />
      </Field>

      {amounts && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Sub-Total</span>
            <span className="tabular-nums">{formatUsd(amounts.subtotalCents)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>IVA 13%</span>
            <span className="tabular-nums">{formatUsd(amounts.ivaCents)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-primary/15 pt-1 font-bold">
            <span>Total ({hours} h × {formatUsd(HOURLY_RATE_CENTS)})</span>
            <span className="tabular-nums">{formatUsd(amounts.totalCents)}</span>
          </div>
        </div>
      )}

      {formError && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {formError}
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="h-11 w-full rounded-xl font-bold">
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? 'Enviando…' : 'Registrar ticket'}
      </Button>
    </form>
  )
}
