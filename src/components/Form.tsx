import { AlertTriangle, Check } from 'lucide-react'
import { cloneElement, isValidElement, useId, type InputHTMLAttributes, type ReactElement, type ReactNode } from 'react'

interface FieldProps {
  label: ReactNode
  help?: ReactNode
  error?: string
  required?: boolean
  /** Un seul champ de saisie : il reçoit id, aria-describedby et aria-invalid. */
  children: ReactElement<Record<string, unknown>>
  className?: string
}

/** Champ : étiquette toujours visible, aide et erreur reliées au contrôle. */
export const Field = ({ label, help, error, required, children, className }: FieldProps) => {
  const id = useId()
  const helpId = help ? `${id}-help` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        'aria-required': required || undefined,
      })
    : children
  return (
    <div className={`field ${className ?? ''}`}>
      <label className="field-label" htmlFor={id}>
        {label}
        {required ? (
          <span className="field-required" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </label>
      {help ? (
        <p id={helpId} className="field-help">
          {help}
        </p>
      ) : null}
      {control}
      {error ? (
        <p id={errorId} className="field-error">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  )
}

export const FieldError = ({ id, children }: { id?: string; children?: ReactNode }) =>
  children ? (
    <p id={id} className="field-error">
      <AlertTriangle size={16} aria-hidden="true" />
      <span>{children}</span>
    </p>
  ) : null

interface ChoiceProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
}

/** Case à cocher : coche et décoche. */
export const Checkbox = ({ label, className, ...props }: ChoiceProps) => (
  <label className={`choice ${className ?? ''}`}>
    <input type="checkbox" {...props} />
    <span className="choice-box" aria-hidden="true">
      {props.checked ? <Check size={14} strokeWidth={3} /> : null}
    </span>
    <span className="choice-label">{label}</span>
  </label>
)

/** Bouton radio isolé. */
export const Radio = ({ label, className, ...props }: ChoiceProps) => (
  <label className={`choice choice-radio ${className ?? ''}`}>
    <input type="radio" {...props} />
    <span className="choice-box" aria-hidden="true" />
    <span className="choice-label">{label}</span>
  </label>
)

interface RadioGroupProps<T extends string> {
  legend: ReactNode
  name: string
  options: Array<{ value: T; label: ReactNode }>
  value: T | undefined
  onChange: (value: T) => void
  error?: string
  help?: ReactNode
  className?: string
  legendClassName?: string
}

/** Groupe de boutons radio dans un fieldset, avec erreur associée. */
export const RadioGroup = <T extends string>({ legend, name, options, value, onChange, error, help, className, legendClassName }: RadioGroupProps<T>) => {
  const id = useId()
  return (
    <fieldset className={className} aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined} aria-invalid={error ? true : undefined}>
      <legend className={legendClassName}>{legend}</legend>
      {help ? (
        <p id={`${id}-help`} className="field-help">
          {help}
        </p>
      ) : null}
      <div className="radio-group">
        {options.map((option) => (
          <Radio key={option.value} name={name} label={option.label} checked={value === option.value} onChange={() => onChange(option.value)} />
        ))}
      </div>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </fieldset>
  )
}
