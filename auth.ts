/**
 * Auth protects /dashboard (admins in DASHBOARD_ADMINS) and /mis-tickets (any
 * collaborator) — the ticket form is public. Google OAuth (AUTH_GOOGLE_ID /
 * AUTH_GOOGLE_SECRET), restricted to verified @dneroapp.com Workspace accounts.
 */
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { NextResponse } from 'next/server'
import { COMPANY_DOMAIN, isCompanyEmail } from '@/shared/lib/validation'
import { isDashboardAdmin } from '@/shared/lib/admins'

export const MY_TICKETS_LOGIN = '/mis-tickets/login'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      // `hd` only pre-selects the account in Google's chooser; the signIn callback enforces it.
      authorization: { params: { hd: COMPANY_DOMAIN, prompt: 'select_account' } },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  pages: {
    signIn: '/login',
    // AccessDenied (not a company account) lands on the login page with ?error=
    error: '/login',
  },
  callbacks: {
    // Any verified company account can sign in; per-route access is decided in `authorized`.
    signIn({ profile }) {
      return profile?.email_verified === true && profile.hd === COMPANY_DOMAIN && isCompanyEmail(profile.email ?? '')
    },
    // Runs in proxy.ts on every matched request, so removing someone from DASHBOARD_ADMINS
    // takes effect on the next deploy.
    authorized({ auth, request }) {
      const email = auth?.user?.email
      if (request.nextUrl.pathname.startsWith('/mis-tickets')) {
        return !!email && isCompanyEmail(email)
          ? true
          : NextResponse.redirect(new URL(MY_TICKETS_LOGIN, request.nextUrl))
      }
      return isDashboardAdmin(email)
    },
  },
})
