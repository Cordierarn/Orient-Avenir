import { Check, Columns2, Compass, Star, User } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import type { Role } from '../types'

const logoUrl = `${import.meta.env.BASE_URL}logo.svg`

/** Logo : boussole à flèche montante, « Orient’ » en accent, « Avenir » en ink, signature en muted. */
export const Logo = ({ to, inverse, compact }: { to?: string; inverse?: boolean; compact?: boolean }) => {
  const content = (
    <>
      <span className={inverse ? 'brand-mark-frame' : undefined}>
        <img className="brand-mark" src={logoUrl} alt="" width={40} height={40} />
      </span>
      <span>
        <span className="brand-name">
          <span className="brand-orient">Orient’</span>
          <span className="brand-avenir">Avenir</span>
        </span>
        {compact ? null : <span className="brand-tagline">Ouvre le champ des possibles</span>}
      </span>
    </>
  )
  const className = `brand ${inverse ? 'brand-inverse' : ''}`
  return to ? (
    <Link to={to} className={className} aria-label="Orient’Avenir, accueil de votre espace">
      {content}
    </Link>
  ) : (
    <span className={className}>{content}</span>
  )
}

export interface TabItem {
  to: string
  label: string
  count?: number
  /** Préfixes de chemin qui activent aussi l'onglet. */
  match?: string[]
}

/** Onglets de navigation principale d'un rôle. */
export const Tabs = ({ items, pathname, label }: { items: TabItem[]; pathname: string; label: string }) => (
  <nav aria-label={label}>
    <div className="tabs">
      {items.map((item) => {
        const active = [item.to, ...(item.match ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`))
        return (
          <Link key={item.to} to={item.to} aria-current={active ? 'page' : undefined}>
            {item.label}
            {item.count !== undefined ? ` (${item.count})` : ''}
          </Link>
        )
      })}
    </div>
  </nav>
)

export const ROLE_LABELS: Record<Role, string> = { lyceen: 'Lycéen', conseiller: 'Conseiller', etablissement: 'Établissement' }

/** Sélecteur « Je suis : Lycéen / Conseiller / Établissement ». */
export const RoleSwitcher = ({ active, onSelect }: { active: Role | null; onSelect: (role: Role) => void }) => (
  <div className="cluster" style={{ gap: 10 }}>
    <span className="role-label" id="role-switcher-label">
      Je suis :
    </span>
    <div className="role-switcher" role="group" aria-labelledby="role-switcher-label">
      {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
        <button key={role} type="button" aria-pressed={active === role} onClick={() => onSelect(role)}>
          {ROLE_LABELS[role]}
        </button>
      ))}
    </div>
  </div>
)

/** Barre d'onglets mobile du lycéen (sous 720 px). */
export const MobileTabBar = ({ pathname }: { pathname: string }) => {
  const items = [
    { to: '/profil/interets', label: 'Profil', icon: User, match: '/profil' },
    { to: '/pistes', label: 'Pistes', icon: Compass, match: '/pistes' },
    { to: '/comparer', label: 'Comparer', icon: Columns2, match: '/comparer' },
    { to: '/favoris', label: 'Favoris', icon: Star, match: '/favoris' },
  ]
  return (
    <nav className="tabbar" aria-label="Navigation mobile">
      {items.map(({ to, label, icon: Icon, match }) => (
        <NavLink key={to} to={to} aria-current={pathname.startsWith(match) ? 'page' : undefined} className={() => ''}>
          <Icon size={22} aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

/** Étapes du questionnaire. */
export const Stepper = ({ current, done }: { current: number; done: number[] }) => {
  const steps = ['Vos intérêts', 'Vos préférences', 'Votre dossier', 'Vos pistes']
  return (
    <ol className="stepper" aria-label="Étapes du profil">
      {steps.map((label, index) => {
        const n = index + 1
        const isDone = done.includes(n) && n !== current
        const isCurrent = n === current
        return (
          <li key={label} className={`step ${isDone ? 'step--done' : ''} ${isCurrent ? 'step--current' : ''}`} aria-current={isCurrent ? 'step' : undefined}>
            <span className="step-num" aria-hidden="true">
              {isDone ? <Check size={16} strokeWidth={3} /> : n}
            </span>
            <span className="step-text">
              <span className="visually-hidden">Étape {n} : </span>
              {label}
              {isDone ? ' · fait' : ''}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** Barre de critère : poids d'un critère dans l'affinité, avec son explication. */
export const CriteriaBar = ({ label, value, note }: { label: string; value: number; note?: string }) => (
  <div>
    <div className="criteria-row-head">
      <span>{label}</span>
      <span>{value} %</span>
    </div>
    <div className="criteria-bar" aria-hidden="true">
      <div className="criteria-fill" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
    {note ? <p className="criteria-note">{note}</p> : null}
  </div>
)

