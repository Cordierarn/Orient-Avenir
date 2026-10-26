import { AlertTriangle, Check, Info, ShieldCheck, X } from 'lucide-react'
import type { ReactNode } from 'react'

/** Pastille : catégorie, domaine ou information secondaire. */
export const Tag = ({ children }: { children: ReactNode }) => <span className="tag">{children}</span>

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'error'

/** Statut : toujours un point et un texte, jamais la couleur seule. */
export const Status = ({ tone = 'neutral', children }: { tone?: StatusTone; children: ReactNode }) => (
  <span className={`status status--${tone}`}>
    <span className="status-dot" aria-hidden="true" />
    {children}
  </span>
)

export type AlertTone = 'info' | 'success' | 'warning' | 'error'

const alertIcons = { info: Info, success: Check, warning: AlertTriangle, error: AlertTriangle }

/** Alerte : confirmation ou erreur, avec la suite à faire. */
export const Alert = ({
  tone = 'info',
  title,
  children,
  role,
  className,
}: {
  tone?: AlertTone
  title?: ReactNode
  children?: ReactNode
  role?: 'alert' | 'status'
  className?: string
}) => {
  const Icon = alertIcons[tone]
  return (
    <div className={`alert alert--${tone} ${className ?? ''}`} role={role}>
      <Icon className="alert-icon" size={20} aria-hidden="true" />
      <div className="stack-sm" style={{ gap: 2 }}>
        {title ? <p className="alert-title">{title}</p> : null}
        {children ? <div className="small">{children}</div> : null}
      </div>
    </div>
  )
}

export const ETHICS_TEXT =
  'Orient’Avenir propose des pistes à discuter, jamais une décision d’admission. Pour candidater, utilisez la plateforme officielle. Données fictives.'

export const EthicsBanner = () => (
  <p className="ethics">
    <ShieldCheck size={18} aria-hidden="true" />
    <span>{ETHICS_TEXT}</span>
  </p>
)

/** Points d'affinité ●●●●○ avec un texte équivalent. */
export const AffinityDots = ({ dots, label = true }: { dots: number; label?: boolean }) => (
  <span className="cluster" style={{ gap: 6, display: 'inline-flex', verticalAlign: 'middle' }}>
    <span className="dots" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`dot ${i <= dots ? 'dot-on' : ''}`} />
      ))}
    </span>
    {label ? <span>{dots} sur 5</span> : <span className="visually-hidden">{dots} sur 5</span>}
  </span>
)

export const Avatar = ({ text, size }: { text: string; size?: 'sm' | 'lg' }) => (
  <span className={`avatar ${size ? `avatar-${size}` : ''}`} aria-hidden="true">
    {text}
  </span>
)

export const CheckItem = ({ ok = true, children }: { ok?: boolean; children: ReactNode }) => (
  <li>
    <span className={`check-icon ${ok ? '' : 'check-icon-bad'}`} aria-hidden="true">
      {ok ? <Check size={14} /> : <X size={14} />}
    </span>
    <span className="small">
      <span className="visually-hidden">{ok ? 'Oui : ' : 'Non : '}</span>
      {children}
    </span>
  </li>
)

export const IconChip = ({ children, tone }: { children: ReactNode; tone?: 'ok' }) => (
  <span className={`icon-chip ${tone === 'ok' ? 'icon-chip-ok' : ''}`} aria-hidden="true">
    {children}
  </span>
)
