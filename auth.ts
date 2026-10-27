/**
 * Auth protects /dashboard only — the ticket form is public. Google OAuth
 * (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET), restricted to verified Workspace
 * accounts listed in DASHBOARD_ADMINS.
 */
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { COMPANY_DOMAIN } from '@/shared/lib/validation'
import { isDashboardAdmin } from '@/shared/lib/admins'

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
    // AccessDenied (not in the allowlist) lands on the login page with ?error=
    error: '/login',
  },
  callbacks: {
    signIn({ profile }) {
      return profile?.email_verified === true && profile.hd === COMPANY_DOMAIN && isDashboardAdmin(profile.email)
    },
    // Re-checked on every request so removing someone from DASHBOARD_ADMINS takes effect on the next deploy.
    authorized({ auth }) {
      return isDashboardAdmin(auth?.user?.email)
    },
  },
})
