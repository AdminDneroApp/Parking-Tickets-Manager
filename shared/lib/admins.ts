/** Dashboard allowlist from DASHBOARD_ADMINS (comma-separated emails). Empty → nobody gets in. */
export function getDashboardAdmins(): Set<string> {
  return new Set(
    (process.env.DASHBOARD_ADMINS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )
}

export const isDashboardAdmin = (email: string | null | undefined) =>
  !!email && getDashboardAdmins().has(email.toLowerCase())
