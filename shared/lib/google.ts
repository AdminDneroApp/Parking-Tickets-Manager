/**
 * Google Sheets + Drive access through the service account. Server-only:
 * the private key never reaches the browser.
 *
 * Sheet layout (row 1 = headers, see docs/INFRASTRUCTURE.md):
 *   A Registrado | B Correo | C ID Ticket | D Fecha | E Hora entrada | F Hora salida |
 *   G Horas calculadas | H Horas | I Tarifa | J Sub-Total | K IVA | L Total | M Foto
 */
import 'server-only'
import { JWT } from 'google-auth-library'
import type { TicketRecord } from '@/types/ticket'

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
]

const COLUMNS = 'A:M'

interface GoogleConfig {
  clientEmail: string
  privateKey: string
  sheetId: string
  sheetTab: string
  driveFolderId: string
}

/** Undefined when any required env var is missing — callers answer 503 / show a notice. */
export function getGoogleConfig(): GoogleConfig | undefined {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
  const sheetId = process.env.GOOGLE_SHEET_ID
  const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!clientEmail || !privateKey || !sheetId || !driveFolderId) return undefined
  return {
    clientEmail,
    // Vercel / .env store the PEM on one line with literal "\n"
    privateKey: privateKey.replace(/\\n/g, '\n'),
    sheetId,
    sheetTab: process.env.GOOGLE_SHEET_TAB || 'Tickets',
    driveFolderId,
  }
}

let client: JWT | undefined

async function authHeader(config: GoogleConfig) {
  client ??= new JWT({ email: config.clientEmail, key: config.privateKey, scopes: SCOPES })
  const { token } = await client.getAccessToken()
  if (!token) throw new Error('Google access token unavailable')
  return { Authorization: `Bearer ${token}` }
}

async function googleFetch(url: string, init: RequestInit) {
  const res = await fetch(url, { ...init, cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Google API ${res.status} ${init.method ?? 'GET'} ${url.split('?')[0]}: ${await res.text()}`)
  }
  return res.json()
}

const sheetRange = (config: GoogleConfig, range: string) =>
  encodeURIComponent(`'${config.sheetTab}'!${range}`)

/** Uploads into the Shared Drive folder; returns the file's view link. */
export async function uploadPhoto(
  config: GoogleConfig,
  file: { name: string; type: string; data: ArrayBuffer },
): Promise<string> {
  const boundary = `dnero-${crypto.randomUUID()}`
  const metadata = JSON.stringify({ name: file.name, parents: [config.driveFolderId] })
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`,
    file.data,
    `\r\n--${boundary}--`,
  ])

  const uploaded = await googleFetch(
    // supportsAllDrives: required for Shared Drive parents (service accounts have no My Drive quota)
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=webViewLink',
    {
      method: 'POST',
      headers: {
        ...(await authHeader(config)),
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  )
  return uploaded.webViewLink as string
}

export async function appendTicket(config: GoogleConfig, record: TicketRecord) {
  const row = [
    record.submittedAt,
    record.email,
    record.ticketId,
    record.date,
    record.entryTime,
    record.exitTime,
    record.calculatedHours,
    record.hours,
    record.rate,
    record.subtotal,
    record.iva,
    record.total,
    record.photoUrl,
  ]
  // RAW: values are stored as typed — user input is never parsed as a formula.
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${sheetRange(config, COLUMNS)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: { ...(await authHeader(config)), 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [row] }),
    },
  )
}

const str = (v: unknown) => (v === undefined || v === null ? '' : String(v))
const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(str(v).replace(/[$,]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export async function readTickets(config: GoogleConfig): Promise<TicketRecord[]> {
  const data = await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${sheetRange(config, 'A2:M')}?valueRenderOption=UNFORMATTED_VALUE`,
    { headers: await authHeader(config) },
  )
  const rows: unknown[][] = data.values ?? []
  return rows
    .filter((r) => r.length > 0 && str(r[2]))
    .map((r) => ({
      submittedAt: str(r[0]),
      email: str(r[1]),
      ticketId: str(r[2]),
      date: str(r[3]),
      entryTime: str(r[4]),
      exitTime: str(r[5]),
      calculatedHours: num(r[6]),
      hours: num(r[7]),
      rate: num(r[8]),
      subtotal: num(r[9]),
      iva: num(r[10]),
      total: num(r[11]),
      photoUrl: str(r[12]),
    }))
}
