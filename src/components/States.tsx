import { AlertTriangle, Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './Button'

export const LoadingState = ({ label = 'Chargement…' }: { label?: string }) => (
  <div className="loading-state" role="status">
    <span className="btn-spinner" aria-hidden="true" />
    <span>{label}</span>
  </div>
)

export const EmptyState = ({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) => (
  <div className="empty-state">
    {icon ? <span className="icon-chip">{icon}</span> : null}
    <h2 className="h2">{title}</h2>
    {children ? <div className="muted">{children}</div> : null}
    {action}
  </div>
)

/** Erreur de lecture : dit ce qui a échoué et propose de réessayer (aucune donnée saisie n'est perdue). */
export const ErrorState = ({ what, error, onRetry }: { what: string; error?: unknown; onRetry?: () => void }) => (
  <div className="alert alert--error" role="alert">
    <AlertTriangle className="alert-icon" size={20} aria-hidden="true" />
    <div className="stack-sm">
      <p className="alert-title">Impossible de charger {what}.</p>
      <p className="small">
        {error instanceof Error && error.name !== 'Error' ? error.message : 'La base locale de ce navigateur n’a pas répondu.'} Vos données enregistrées ne sont pas
        perdues : rechargez la page ou réessayez.
      </p>
      <div>
        <Button variant="secondary" onClick={onRetry ?? (() => window.location.reload())}>
          Réessayer
        </Button>
      </div>
    </div>
  </div>
)

/** Bouton favori : « Ajouter aux favoris » / « Dans mes favoris ». */
export const FavoriteToggle = ({ active, onToggle, disabled, block }: { active: boolean; onToggle: () => void; disabled?: boolean; block?: boolean }) => (
  <button
    type="button"
    className={`btn btn-secondary fav-toggle ${block ? 'btn-block' : ''}`}
    aria-pressed={active}
    onClick={onToggle}
    disabled={disabled}
  >
    <Star size={18} aria-hidden="true" fill={active ? 'currentColor' : 'none'} />
    {active ? 'Dans mes favoris' : 'Ajouter aux favoris'}
  </button>
)
