'use client'

import { useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { cn } from '@/shared/lib/utils'
import { formatTime } from '@/shared/lib/format'
import { parseTime } from '@/shared/lib/pricing'

/**
 * 12-hour time picker in a modal/bottom sheet. Replaces <input type="time">:
 * native pickers ignore min/max on phones, can't be laid out on iOS, and on
 * Android "Clear" closes the dialog instead of resetting the selection.
 */

type Period = 'am' | 'pm'

interface Selection {
  hour: number | null
  minute: number | null
  period: Period | null
}

const EMPTY: Selection = { hour: null, minute: null, period: null }
const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const MINUTES = Array.from({ length: 60 }, (_, i) => i)
const PERIODS: Period[] = ['am', 'pm']
const PERIOD_LABEL: Record<Period, string> = { am: 'a. m.', pm: 'p. m.' }
const LAST_MINUTE = 24 * 60 - 1

const pad = (n: number) => String(n).padStart(2, '0')
const toMinutes = (hour: number, minute: number, period: Period) =>
  ((hour % 12) + (period === 'pm' ? 12 : 0)) * 60 + minute

function fromValue(value: string): Selection {
  const total = parseTime(value)
  if (total === null) return EMPTY
  const h24 = Math.floor(total / 60)
  return { hour: h24 % 12 || 12, minute: total % 60, period: h24 < 12 ? 'am' : 'pm' }
}

/** Whether some completion of the partial selection lands inside [min, max] (minutes since midnight). */
function isReachable(sel: Selection, min: number, max: number) {
  for (const period of sel.period ? [sel.period] : PERIODS) {
    for (const hour of sel.hour !== null ? [sel.hour] : HOURS) {
      const start = toMinutes(hour, sel.minute ?? 0, period)
      const end = sel.minute !== null ? start : start + 59
      if (end >= min && start <= max) return true
    }
  }
  return false
}

interface TimePickerProps {
  id: string
  name: string
  label: string
  /** HH:MM (24 h) or '' */
  value: string
  onChange: (value: string) => void
  /** Inclusive bounds in minutes since midnight; options outside are disabled. */
  min?: number
  max?: number
  invalid?: boolean
}

export function TimePicker({ id, name, label, value, onChange, min = 0, max = LAST_MINUTE, invalid }: TimePickerProps) {
  const [draft, setDraft] = useState<Selection | null>(null)

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <button
        id={id}
        type="button"
        onClick={() => setDraft(fromValue(value))}
        data-invalid={invalid}
        aria-haspopup="dialog"
        className={cn(
          'flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-border bg-muted/60 px-4 text-base transition-colors sm:text-sm',
          'focus-visible:border-primary/60 data-[invalid=true]:border-destructive/60',
          !value && 'text-muted-foreground/60',
        )}
      >
        <span className="truncate tabular-nums">{value ? formatTime(value) : '--:--'}</span>
        <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {draft && (
        <PickerDialog
          label={label}
          initial={draft}
          min={min}
          max={max}
          onClose={() => setDraft(null)}
          onAccept={(next) => {
            onChange(next)
            setDraft(null)
          }}
        />
      )}
    </>
  )
}

interface PickerDialogProps {
  label: string
  initial: Selection
  min: number
  max: number
  onClose: () => void
  onAccept: (value: string) => void
}

/** Mounted only while open, so the draft starts fresh from the field value each time. */
function PickerDialog({ label, initial, min, max, onClose, onAccept }: PickerDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  // The saved value can sit outside new bounds (the other time changed) — start empty then
  const [sel, setSel] = useState(() => (isReachable(initial, min, max) ? initial : EMPTY))

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    // Bring the current value into view in each column
    dialog?.querySelectorAll<HTMLElement>('[data-selected=true]').forEach((el) => {
      const column = el.parentElement
      if (column) column.scrollTop = el.offsetTop - column.clientHeight / 2 + el.clientHeight / 2
    })
  }, [])

  const isComplete = sel.hour !== null && sel.minute !== null && sel.period !== null
  const isEmpty = sel.hour === null && sel.minute === null && sel.period === null
  // Options outside the bounds are disabled, so a complete selection is always in range
  const canAccept = isEmpty || isComplete

  function accept() {
    if (!canAccept) return
    if (isEmpty) return onAccept('')
    const total = toMinutes(sel.hour!, sel.minute!, sel.period!)
    onAccept(`${pad(Math.floor(total / 60))}:${pad(total % 60)}`)
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      // Click on the backdrop (outside the panel) cancels
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={cn(
        // Phones: pinned to the bottom edge. Not via margin-top:auto — Safari doesn't size
        // modal dialogs to fit-content, so the sheet stayed at the top.
        'fixed inset-x-0 bottom-0 top-auto m-0 w-full max-w-full rounded-t-2xl border-x-0 border-b-0 border-t border-border bg-card p-0 text-foreground',
        'backdrop:bg-black/70 backdrop:backdrop-blur-sm',
        'sm:inset-0 sm:m-auto sm:max-w-sm sm:rounded-2xl sm:border',
      )}
    >
      <div className="px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold">{label}</h2>
          <span className="text-2xl font-bold tabular-nums">
            {sel.hour ?? '--'}:{sel.minute !== null ? pad(sel.minute) : '--'}{' '}
            <span className="text-base font-semibold text-muted-foreground">
              {sel.period ? PERIOD_LABEL[sel.period] : ''}
            </span>
          </span>
        </div>

        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <Column
            label="Hora"
            options={HOURS}
            selected={sel.hour}
            format={String}
            isDisabled={(hour) => !isReachable({ ...sel, hour }, min, max)}
            onSelect={(hour) => setSel({ ...sel, hour })}
          />
          <Column
            label="Min"
            options={MINUTES}
            selected={sel.minute}
            format={pad}
            isDisabled={(minute) => !isReachable({ ...sel, minute }, min, max)}
            onSelect={(minute) => setSel({ ...sel, minute })}
          />
          <Column
            label=""
            options={PERIODS}
            selected={sel.period}
            format={(p) => PERIOD_LABEL[p]}
            isDisabled={(period) => !isReachable({ ...sel, period }, min, max)}
            onSelect={(period) => setSel({ ...sel, period })}
          />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={() => setSel(EMPTY)} className="h-11 rounded-xl px-3">
            Limpiar
          </Button>
          <div className="flex-1" />
          <Button type="button" variant="outline" onClick={onClose} className="h-11 rounded-xl px-4">
            Cancelar
          </Button>
          <Button type="button" onClick={accept} disabled={!canAccept} className="h-11 rounded-xl px-4">
            Aceptar
          </Button>
        </div>
      </div>
    </dialog>
  )
}

interface ColumnProps<T extends string | number> {
  label: string
  options: T[]
  selected: T | null
  format: (value: T) => string
  isDisabled: (value: T) => boolean
  onSelect: (value: T) => void
}

function Column<T extends string | number>({ label, options, selected, format, isDisabled, onSelect }: ColumnProps<T>) {
  return (
    <div className="min-w-0">
      <p className="mb-1 h-4 text-center text-xs text-muted-foreground">{label}</p>
      <div className="relative h-52 space-y-1 overflow-y-auto overscroll-contain rounded-xl bg-muted/40 p-1">
        {options.map((option) => {
          const isSelected = option === selected
          return (
            <button
              key={option}
              type="button"
              data-selected={isSelected}
              disabled={isDisabled(option) && !isSelected}
              onClick={() => onSelect(option)}
              className={cn(
                'w-full whitespace-nowrap rounded-lg px-3 py-2 text-base tabular-nums transition-colors',
                isSelected ? 'bg-primary font-semibold text-primary-foreground' : 'hover:bg-accent',
                'disabled:pointer-events-none disabled:opacity-25',
              )}
            >
              {format(option)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
