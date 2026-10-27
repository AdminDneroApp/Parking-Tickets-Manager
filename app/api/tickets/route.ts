/**
 * POST /api/tickets — public endpoint behind the form. Validates again on the
 * server, uploads the photo to Drive, then appends a row to the Sheet.
 */
import { NextResponse } from 'next/server'
import type { TicketInput } from '@/types/ticket'
import { appendTicket, getGoogleConfig, uploadPhoto } from '@/shared/lib/google'
import { HOURLY_RATE_CENTS, billableHours, breakdown, cents } from '@/shared/lib/pricing'
import { timestamp, todayIso } from '@/shared/lib/dates'
import { validatePhoto, validateTicket } from '@/shared/lib/validation'

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

export async function POST(request: Request) {
  const config = getGoogleConfig()
  if (!config) {
    return NextResponse.json({ error: 'El registro no está configurado.' }, { status: 503 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  // Honeypot: hidden field only bots fill in. Pretend success.
  if (form.get('website')) return NextResponse.json({ ok: true })

  const field = (name: string) => String(form.get(name) ?? '').trim()
  const input: TicketInput = {
    email: field('email').toLowerCase(),
    ticketId: field('ticketId').toUpperCase(),
    date: field('date'),
    entryTime: field('entryTime'),
    exitTime: field('exitTime'),
    hours: Number(field('hours')),
  }
  const photo = form.get('photo')
  const file = photo instanceof File ? photo : null

  const errors = validateTicket(input, todayIso())
  const photoError = validatePhoto(file)
  if (photoError) errors.photo = photoError
  if (Object.keys(errors).length > 0 || !file) {
    return NextResponse.json({ errors }, { status: 422 })
  }

  try {
    const submittedAt = timestamp()
    const photoUrl = await uploadPhoto(config, {
      name: `${input.date}_${input.ticketId}_${input.email.split('@')[0]}.${EXTENSIONS[file.type]}`,
      type: file.type,
      data: await file.arrayBuffer(),
    })

    const { subtotalCents, ivaCents, totalCents } = breakdown(input.hours)
    await appendTicket(config, {
      ...input,
      submittedAt,
      calculatedHours: billableHours(input.entryTime, input.exitTime)!,
      rate: cents(HOURLY_RATE_CENTS),
      subtotal: cents(subtotalCents),
      iva: cents(ivaCents),
      total: cents(totalCents),
      photoUrl,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[tickets] Failed to save ticket', err)
    return NextResponse.json(
      { error: 'No se pudo guardar el ticket. Intenta de nuevo en unos minutos.' },
      { status: 502 },
    )
  }
}
