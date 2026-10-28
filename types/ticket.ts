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
  /** Billable hours from entry/exit (computed on the server, not editable). */
  hours: number
}

/** One row of the Google Sheet, as read back by the dashboard. */
export interface TicketRecord extends TicketInput {
  submittedAt: string
  /** Hours derived from entry/exit. Rows saved before hours became read-only may differ from `hours`. */
  calculatedHours: number
  rate: number
  subtotal: number
  iva: number
  total: number
  photoUrl: string
}
