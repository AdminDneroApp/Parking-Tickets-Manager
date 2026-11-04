/** Fields the collaborator submits (the photo travels separately as a file). */
export interface TicketInput {
  email: string
  ticketId: string
  /** YYYY-MM-DD */
  date: string
  /** HH:MM */
  entryTime: string
  /** HH:MM */
  exitTime: string
  /** Total printed on the ticket, in cents (IVA included). The ticket is the source of truth. */
  totalCents: number
}

/** One row of the Google Sheet, as read back by the dashboard. */
export interface TicketRecord extends Omit<TicketInput, 'totalCents'> {
  submittedAt: string
  /** Hours derived from entry/exit (every started hour counts). Reference only — may differ from `hours`. */
  calculatedHours: number
  /** Hours charged on the ticket, derived from its total. Older rows: hours entered/calculated at the time. */
  hours: number
  rate: number
  subtotal: number
  iva: number
  total: number
  photoUrl: string
}
