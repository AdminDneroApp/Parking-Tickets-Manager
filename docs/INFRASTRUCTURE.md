# Infrastructure — DNERO Parking Tickets Manager

Living document. Update it in the same commit as any change to routes, server
dependencies, deployment settings, or environment variables.

## Routes

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Ticket form (static page) |
| `POST /api/tickets` | Public | Validates, uploads the photo to Drive, appends a row to the Sheet |
| `/login` | Public | Google sign-in for the dashboard |
| `/dashboard?mes=YYYY-MM` | `DASHBOARD_ADMINS` only | KPIs, totals per day and per collaborator, records table |
| `/api/auth/*` | next-auth | OAuth callbacks |

`proxy.ts` matches `/dashboard/:path*` only; the `authorized` callback in `auth.ts`
checks the allowlist on every request.

## Google setup

### Service account (Sheets + Drive)

1. APIs enabled in the GCP project: Google Sheets API, Google Drive API.
2. **Shared Drive**: the Sheet and the photos folder both live in one master Shared
   Drive. Add the service account as a member of that Shared Drive with the
   **Content manager** role; that covers both (no per-file sharing needed).
   Dashboard admins need at least view access to open the photo links.
3. **Sheet**: tab name = `GOOGLE_SHEET_TAB` (default `Tickets`). Row 1 headers, columns A–M:

   | A | B | C | D | E | F | G | H | I | J | K | L | M |
   |---|---|---|---|---|---|---|---|---|---|---|---|---|
   | Registrado | Correo | ID Ticket | Fecha | Hora entrada | Hora salida | Horas calculadas | Horas | Tarifa | Sub-Total | IVA | Total | Foto |

   - *Horas calculadas* comes from entry/exit (fractions round up). *Horas* is the
     value the collaborator confirmed (editable). They differ when the hours were edited
     by hand; the dashboard flags those rows.
   - Values are written with `valueInputOption=RAW` (no formula injection). Format
     columns J–L as currency in the Sheet if you like; the app reads unformatted values.
   - Do not reorder columns: `shared/lib/google.ts` reads and writes by position.
4. **Photos folder**: service accounts have no storage quota in My Drive, so the folder
   must stay inside the Shared Drive (moving it to someone's My Drive breaks uploads).

### OAuth client (dashboard login)

GCP → APIs & Services → Credentials → OAuth client ID (Web application). The OAuth
consent screen should be **Internal** (Workspace users only).

Authorized redirect URIs:

- `http://localhost:3000/api/auth/callback/google`
- `https://parking.dneroapp.com/api/auth/callback/google`

Authorized JavaScript origins: `http://localhost:3000`, `https://parking.dneroapp.com`.

Sign-in requires a verified `@dneroapp.com` account (`hd` claim) **and** membership in
`DASHBOARD_ADMINS`.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Yes | `client_email` from the JSON key |
| `GOOGLE_PRIVATE_KEY` | Yes | `private_key` from the JSON key; `\n` escapes are converted |
| `GOOGLE_SHEET_ID` | Yes | |
| `GOOGLE_SHEET_TAB` | No | Default `Tickets` |
| `GOOGLE_DRIVE_FOLDER_ID` | Yes | Folder inside a Shared Drive |
| `AUTH_SECRET` | Yes | `openssl rand -base64 32` — different per environment |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Yes | OAuth client |
| `DASHBOARD_ADMINS` | Yes | Comma-separated emails. Changes need a redeploy |
| `NEXT_PUBLIC_SITE_URL` | No | Default `https://parking.dneroapp.com` (metadata base URL) |

Without the `GOOGLE_*` vars the form answers 503 and the dashboard shows a notice.

## Deployment

Vercel, Next.js preset, no extra build settings, deployed from
`github.com/AdminDneroApp/Parking-Tickets-Manager` (`main` → production). Production domain:
**`parking.dneroapp.com`** (add it under Project → Domains and create the CNAME
`parking` → `cname.vercel-dns.com` — or the project-specific value Vercel shows). Node.js
runtime everywhere (`proxy.ts` runs on Node in Next 16).

DNS for dneroapp.com is hosted at **SiteGround** (nameservers `ns1/ns2.siteground.net`):
Site Tools → Domain → DNS Zone Editor → CNAME, name `parking`. Only add that one record;
don't change the nameservers or existing records (the rest of dneroapp.com depends on them).

Limits worth knowing:

- Vercel caps request bodies at **4.5 MB**. The form downscales photos in the browser
  (max 1600px JPEG) and the API rejects files over 4 MB.
- The form is public. Protection is the `@dneroapp.com` email check, server-side
  validation and a honeypot field — it does not prove the submitter owns the email.
  Add Vercel Firewall rate limiting on `/api/tickets` if spam appears.

## Pricing

`shared/lib/pricing.ts`: $1.50 per hour or fraction, IVA (13%) included.
`Sub-Total = round(Total / 1.13)`, `IVA = Total − Sub-Total` (cents), e.g. 9 h → $13.50 = $11.95 + $1.55.
The rate is stored on each row, so changing it doesn't rewrite history.
