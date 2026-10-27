// Next 16: `proxy` replaces `middleware`. Only /dashboard is protected; the
// `authorized` callback in auth.ts redirects anyone else to /login.
export { auth as proxy } from './auth'

export const config = {
  matcher: ['/dashboard/:path*'],
}
