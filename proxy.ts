// Next 16: `proxy` replaces `middleware`. Protects /dashboard (admins) and /mis-tickets
// (any collaborator); the `authorized` callback in auth.ts redirects to the matching login.
// /mis-tickets/login is deliberately not matched.
export { auth as proxy } from './auth'

export const config = {
  matcher: ['/dashboard/:path*', '/mis-tickets'],
}
