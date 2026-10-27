interface FieldProps {
  id: string
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}

/** Label + control + hint or error message. */
export function Field({ id, label, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}
