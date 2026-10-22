import { Heart, HeartOff } from 'lucide-react'
import type { PropsWithChildren } from 'react'

export const Button = ({
  children,
  variant = 'primary',
  ...props
}: PropsWithChildren<{ variant?: 'primary' | 'secondary' | 'ghost' } & React.ButtonHTMLAttributes<HTMLButtonElement>>) => (
  <button className={`btn btn-${variant}`} {...props}>
    {children}
  </button>
)

export const Tag = ({ children }: PropsWithChildren) => <span className="tag">{children}</span>

export const Status = ({ tone, text }: { tone: 'neutral' | 'info' | 'success' | 'warning' | 'error'; text: string }) => (
  <span className={`status status-${tone}`}>{text}</span>
)

export const Tabs = ({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ id: string; label: string }>
  value: string
  onChange: (value: string) => void
}) => (
  <div className="tabs" role="tablist">
    {tabs.map((tab) => (
      <button key={tab.id} role="tab" aria-selected={value === tab.id} className={value === tab.id ? 'active' : ''} onClick={() => onChange(tab.id)}>
        {tab.label}
      </button>
    ))}
  </div>
)

export const RoleSwitcher = ({
  role,
  onChange,
}: {
  role: string
  onChange: (role: 'lyceen' | 'conseiller' | 'etablissement') => void
}) => (
  <div className="role-switcher" role="radiogroup" aria-label="Choisir un rôle">
    {[
      { id: 'lyceen', label: 'Lycéen' },
      { id: 'conseiller', label: 'Conseiller' },
      { id: 'etablissement', label: 'Établissement' },
    ].map((item) => (
      <label key={item.id}>
        <input type="radio" checked={role === item.id} onChange={() => onChange(item.id as 'lyceen' | 'conseiller' | 'etablissement')} />
        {item.label}
      </label>
    ))}
  </div>
)

export const Checkbox = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <label className="field-inline">
    <input type="checkbox" {...props} />
    {label}
  </label>
)

export const Radio = ({
  name,
  options,
  value,
  onChange,
}: {
  name: string
  options: Array<{ label: string; value: string }>
  value: string
  onChange: (value: string) => void
}) => (
  <div className="radio-group" role="radiogroup" aria-label={name}>
    {options.map((option) => (
      <label key={option.value}>
        <input type="radio" name={name} checked={value === option.value} onChange={() => onChange(option.value)} />
        {option.label}
      </label>
    ))}
  </div>
)

export const FavoriteToggle = ({ active, onToggle }: { active: boolean; onToggle: () => void }) => (
  <button className="favorite-toggle" onClick={onToggle} aria-label={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
    {active ? <Heart /> : <HeartOff />}
    {active ? 'Favori' : 'Mettre en favori'}
  </button>
)

export const LevelSlider = ({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) => (
  <label className="slider-field">
    <span>{label}</span>
    <input type="range" min={0} max={4} step={1} value={value} onChange={(event) => onChange(Number(event.target.value))} />
  </label>
)

export const Field = ({
  label,
  error,
  children,
}: PropsWithChildren<{ label: string; error?: string }>) => (
  <label className="field">
    <span>{label}</span>
    {children}
    {error ? <small className="field-error">{error}</small> : null}
  </label>
)

export const Alert = ({ tone = 'info', children }: PropsWithChildren<{ tone?: 'info' | 'warning' | 'success' }>) => (
  <div className={`alert alert-${tone}`}>{children}</div>
)

export const Modal = ({
  open,
  title,
  onClose,
  children,
}: PropsWithChildren<{ open: boolean; title: string; onClose: () => void }>) => {
  if (!open) return null
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} aria-label="Fermer">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export const EthicsBanner = () => (
  <p className="ethics-banner">
    Orient&apos;Avenir propose des pistes à discuter, jamais une décision d&apos;admission. Pour candidater, utilisez la plateforme officielle. Données fictives.
  </p>
)

export const CriteriaBar = ({ label, value }: { label: string; value: number }) => (
  <div className="criteria-item">
    <span>{label}</span>
    <div className="criteria-bar" aria-hidden="true">
      <div style={{ width: `${value}%` }} />
    </div>
    <strong>{value} %</strong>
  </div>
)
