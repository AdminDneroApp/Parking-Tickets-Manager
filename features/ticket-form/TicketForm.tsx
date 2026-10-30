'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, CheckCircle2, ImageUp, Loader2, WifiOff } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Field } from '@/shared/ui/Field'
import { cn } from '@/shared/lib/utils'
import { HOURLY_RATE_CENTS, billableHours, breakdown, formatUsd, parseTime } from '@/shared/lib/pricing'
import { todayIso } from '@/shared/lib/dates'
import { type TicketErrors, PHOTO_TYPES, validatePhoto, validateTicket } from '@/shared/lib/validation'
import { InstallPrompt } from '@/features/pwa/InstallPrompt'
import { useIsOffline, useServiceWorker } from '@/features/pwa/use-pwa'
import { compressImage } from './compress-image'
import { TimePicker } from './TimePicker'
import { WebcamDialog, useCameraMode } from './WebcamCapture'

const EMAIL_STORAGE_KEY = 'parking.email'

// text-base on phones: iOS zooms into inputs under 16px
const inputClass =
  'h-11 min-w-0 rounded-xl bg-muted/60 px-4 text-base sm:text-sm placeholder:text-muted-foreground/60 focus-visible:border-primary/60 focus-visible:ring-primary/20 aria-[invalid=true]:border-destructive/60'

export function TicketForm() {
  useServiceWorker()
  const isOffline = useIsOffline()

  /** Set after mount: the page is prerendered, "today" must come from the browser. */
  const [today, setToday] = useState('')
  const [email, setEmail] = useState('')
  const [ticketId, setTicketId] = useState('')
  const [date, setDate] = useState('')
  const [entryTime, setEntryTime] = useState('')
  const [exitTime, setExitTime] = useState('')
  /** Which time field was edited last — the order alert shows under that one. */
  const [lastTimeField, setLastTimeField] = useState<'entryTime' | 'exitTime'>('exitTime')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const { mode: cameraMode, markMissing: markCameraMissing } = useCameraMode()
  const [webcamOpen, setWebcamOpen] = useState(false)

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

  // Read-only: always derived from entry/exit (the server recalculates it too)
  const hours = billableHours(entryTime, exitTime)

  // The pickers disable out-of-order times; this covers a value loaded before the other one changed
  const timesOutOfOrder =
    parseTime(entryTime) !== null && parseTime(exitTime) !== null && hours === null
  const entryTimeError =
    errors.entryTime ??
    (timesOutOfOrder && lastTimeField === 'entryTime' ? 'La entrada debe ser anterior a la salida.' : undefined)
  const exitTimeError =
    errors.exitTime ??
    (timesOutOfOrder && lastTimeField === 'exitTime' ? 'La salida debe ser posterior a la entrada.' : undefined)

  function changeTime(field: 'entryTime' | 'exitTime', value: string) {
    if (field === 'entryTime') setEntryTime(value)
    else setExitTime(value)
    setLastTimeField(field)
    // Drop submit errors on both times — the live check above takes over
    setErrors((prev) => ({ ...prev, entryTime: undefined, exitTime: undefined }))
  }

  const hasCamera = cameraMode === 'native' || cameraMode === 'webcam'

  const amounts = useMemo(() => (hours ? breakdown(hours) : null), [hours])
  const entryMinutes = parseTime(entryTime)
  const exitMinutes = parseTime(exitTime)

  function handlePhotoInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Clear the input so picking the same file again still fires onChange
    e.target.value = ''
    if (file) void selectPhoto(file)
  }

  async function selectPhoto(file: File) {
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
    const input = { email: email.trim().toLowerCase(), ticketId: ticketId.trim(), date, entryTime, exitTime, hours: hours ?? 0 }
    const nextErrors = validateTicket(input, today)
    const photoError = validatePhoto(photo)
    if (photoError) nextErrors.photo = photoError
    setErrors(nextErrors)
    setFormError(null)
    if (Object.keys(nextErrors).length > 0 || !photo) return

    const body = new FormData(e.currentTarget)
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
    setLastTimeField('exitTime')
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
        <div className="w-full pt-2">
          <InstallPrompt />
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Honeypot — hidden from people, bots fill it */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      {isOffline && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200"
        >
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
          <span>
            Sin conexión a internet. Puedes llenar los datos y tomar la foto del ticket; el botón de envío se activará al recuperar la señal.
          </span>
        </div>
      )}

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

      <div className="grid grid-cols-2 gap-3 sm:gap-4 [&>*]:min-w-0">
        <Field id="entryTime" label="Hora de entrada" error={entryTimeError}>
          <TimePicker
            id="entryTime"
            name="entryTime"
            label="Hora de entrada"
            value={entryTime}
            onChange={(value) => changeTime('entryTime', value)}
            // Entry must be before exit (at least one minute)
            max={exitMinutes !== null ? exitMinutes - 1 : undefined}
            invalid={!!entryTimeError}
          />
        </Field>
        <Field id="exitTime" label="Hora de salida" error={exitTimeError}>
          <TimePicker
            id="exitTime"
            name="exitTime"
            label="Hora de salida"
            value={exitTime}
            onChange={(value) => changeTime('exitTime', value)}
            min={entryMinutes !== null ? entryMinutes + 1 : undefined}
            invalid={!!exitTimeError}
          />
        </Field>
      </div>

      <Field
        id="hours"
        label="Cantidad de horas"
        hint="Se calcula con la hora de entrada y salida; cada fracción cuenta como hora completa."
        error={errors.hours}
      >
        <output
          id="hours"
          className="flex h-11 items-center rounded-xl border border-border bg-muted/30 px-4 text-base tabular-nums text-muted-foreground sm:text-sm"
        >
          {hours ? `${hours} ${hours === 1 ? 'hora' : 'horas'}` : '—'}
        </output>
      </Field>

      <Field id="photo" label="Foto del ticket" error={errors.photo}>
        {photoPreview && (
          <div className="flex justify-center overflow-hidden rounded-xl border border-border bg-muted/40 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
            <img src={photoPreview} alt="Vista previa del ticket" className="max-h-56 rounded-lg object-contain" />
          </div>
        )}
        <div className={cn('grid gap-3', hasCamera ? 'grid-cols-2' : 'grid-cols-1')}>
          {hasCamera && (
            <Button
              type="button"
              variant="outline"
              onClick={() => (cameraMode === 'native' ? cameraInputRef.current?.click() : setWebcamOpen(true))}
              className="h-11 min-w-0 rounded-xl px-3"
            >
              <Camera className="h-4 w-4 text-primary" />
              {photoPreview ? 'Tomar otra' : 'Tomar foto'}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => uploadInputRef.current?.click()}
            className="h-11 min-w-0 rounded-xl px-3"
          >
            <ImageUp className="h-4 w-4 text-primary" />
            {photoPreview ? 'Cambiar imagen' : 'Subir imagen'}
          </Button>
        </div>
        {/* Phones and tablets: capture opens the rear camera app directly */}
        {cameraMode === 'native' && (
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoInput}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
          />
        )}
        <input
          ref={uploadInputRef}
          id="photo"
          type="file"
          accept={PHOTO_TYPES.join(',')}
          onChange={handlePhotoInput}
          className="sr-only"
          tabIndex={-1}
        />
        {/* Desktops with a webcam: live preview */}
        {webcamOpen && (
          <WebcamDialog
            onCapture={(file) => {
              setWebcamOpen(false)
              void selectPhoto(file)
            }}
            onClose={() => setWebcamOpen(false)}
            onMissing={markCameraMissing}
            onUpload={() => {
              setWebcamOpen(false)
              uploadInputRef.current?.click()
            }}
          />
        )}
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

      <Button type="submit" disabled={isSubmitting || isOffline} className="h-11 w-full rounded-xl font-bold">
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {!isSubmitting && isOffline && <WifiOff className="h-4 w-4" />}
        {isSubmitting ? 'Enviando…' : isOffline ? 'Sin conexión para enviar' : 'Registrar ticket'}
      </Button>

      <InstallPrompt />
    </form>
  )
}
