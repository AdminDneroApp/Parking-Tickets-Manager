/** Business timezone: dates and "today" are always evaluated in El Salvador time. */
export const TIMEZONE = 'America/El_Salvador'

/** YYYY-MM-DD in the business timezone. */
export function todayIso(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(now)
}

/** "YYYY-MM-DD HH:MM:SS" in the business timezone — the Sheet's "Registrado" column. */
export function timestamp(now = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: TIMEZONE,
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(now)
}
