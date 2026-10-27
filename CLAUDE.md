# CLAUDE.md — DNERO Parking Tickets Manager

Single public form where DNERO collaborators register parking tickets, plus an
admin-only `/dashboard`. No backend or database: the Google Sheet is the data store
and photos go to a Shared Drive folder, both through a service account.

## ⛔ Rules

1. **Living docs** — when changing routes, server dependencies, deployment settings
   or env vars, update [`docs/INFRASTRUCTURE.md`](docs/INFRASTRUCTURE.md) in the same commit.
2. **Google credentials are server-only** — `shared/lib/google.ts` imports
   `server-only`. The browser only talks to `/api/tickets`.
3. **Validate on the server** — the form is public. `shared/lib/validation.ts` is
   shared by the form and `app/api/tickets/route.ts`; the route is the source of truth.
4. **Sheet columns are positional (A–M)** — changing them means updating
   `appendTicket`, `readTickets` and the table in `docs/INFRASTRUCTURE.md` together.
5. **Money in cents** — use `shared/lib/pricing.ts`; never compute IVA with floats inline.
6. **Use `proxy.ts`, not `middleware.ts`** (Next.js 16).

## Stack

Next.js 16 (App Router) on Vercel · next-auth v5 beta (Google provider, dashboard only) ·
Tailwind CSS 3 + Radix Slot + lucide-react · TypeScript strict.

**Spanish only** — no `[lang]` segment, no translation files. UI copy is written
in Spanish directly in the components; numbers, money and dates go through
`shared/lib/format.ts` (`es-SV`). Code, comments and dev docs stay in English.

Production: `https://parking.dneroapp.com` (Vercel).

## Layout

```
app/page.tsx                 form (static)
app/api/tickets/route.ts     POST: validate → Drive upload → Sheet append
app/dashboard/page.tsx       admin dashboard (server component, reads the Sheet)
app/login/page.tsx           Google sign-in
auth.ts / proxy.ts           allowlist (DASHBOARD_ADMINS) on /dashboard
features/ticket-form/        form + client-side photo compression
features/dashboard/          aggregation + HTML/CSS charts
shared/lib/                  google, pricing, validation, dates (America/El_Salvador), admins
```

## Local development

```
cp .env.example .env.local   # fill in values
npm install
npm run dev                  # http://localhost:3000
npm run build && npm run lint
```
