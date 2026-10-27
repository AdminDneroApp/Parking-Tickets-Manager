/** Display formatting — the app is Spanish only (El Salvador: USD, dd/mm/aaaa). */
export const LOCALE = 'es-SV'

const usd = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'USD' })
const integer = new Intl.NumberFormat(LOCALE)
const shortDate = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})
const monthYear = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric', timeZone: 'UTC' })

export const formatMoney = (dollars: number) => usd.format(dollars)
export const formatNumber = (n: number) => integer.format(n)

/** YYYY-MM-DD → dd/mm/aaaa (unparseable values are shown as-is). */
export function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? iso : shortDate.format(d)
}

/** YYYY-MM → "octubre de 2026" */
export const formatMonth = (month: string) => monthYear.format(new Date(`${month}-01T00:00:00Z`))
