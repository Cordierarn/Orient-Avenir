import { History } from 'lucide-react'
import { useCurrentUser } from '../../auth/AuthContext'
import { EmptyState, ErrorState, LinkButton, LoadingState, ROLE_LABELS, Status } from '../../components'
import { activityRepo } from '../../db/repositories'
import { useRepo } from '../../hooks/useRepo'
import { usePageTitle } from '../../hooks/usePageTitle'
import { formatDate, formatHour } from '../../lib/dates'
import type { ActivityType } from '../../types'

const TYPE_LABELS: Record<ActivityType, string> = {
  connexion: 'Connexion',
  deconnexion: 'Déconnexion',
  inscription: 'Inscription',
  partage_accorde: 'Partage accordé',
  partage_retire: 'Partage retiré',
  visibilite_accordee: 'Visibilité accordée',
  visibilite_retiree: 'Visibilité retirée',
  rdv_demande: 'Rendez-vous demandé',
  rdv_accepte: 'Rendez-vous accepté',
  rdv_laisse: 'Demande transmise',
  rdv_annule: 'Demande annulée',
  fiche_publiee: 'Fiche publiée',
  invitation: 'Invitation',
  reinitialisation: 'Réinitialisation',
}

/** « Mon compte » : informations du compte et historique de ses actions. */
export const AccountPage = () => {
  usePageTitle('Mon compte')
  const user = useCurrentUser()
  const activity = useRepo(() => activityRepo.listActivity(user.id), [user.id])

  return (
    <div className="container page stack-lg">
      <div>
        <h1 className="h1">Mon compte</h1>
        <p className="lead">Vos informations restent dans ce navigateur. Aucune donnée n’est envoyée à un serveur.</p>
      </div>
      <section className="card card-lg stack-sm" aria-labelledby="account-info">
        <h2 id="account-info" className="h2">
          Informations
        </h2>
        <dl className="kv-grid" style={{ margin: 0 }}>
          <div className="kv">
            <dt>Nom</dt>
            <dd>
              {user.firstName} {user.lastName}
            </dd>
          </div>
          <div className="kv">
            <dt>Espace</dt>
            <dd>{ROLE_LABELS[user.role]}</dd>
          </div>
          <div className="kv">
            <dt>E-mail</dt>
            <dd className="word-break">{user.isGuest ? 'Mode invité' : user.email}</dd>
          </div>
        </dl>
        <p className="small muted">
          Compte créé le {formatDate(user.createdAt)}. {user.isDemo ? 'Compte de démonstration : il peut être réinitialisé depuis le menu du compte.' : ''}
        </p>
        {user.role === 'lyceen' ? (
          <div>
            <LinkButton to="/profil/dossier" variant="secondary">
              Gérer ou supprimer mes moyennes
            </LinkButton>
          </div>
        ) : null}
      </section>
      <section className="card card-lg stack" aria-labelledby="history-title">
        <h2 id="history-title" className="h2 cluster">
          <History size={20} aria-hidden="true" className="accent" /> Historique
        </h2>
        <p className="small muted">Connexions, partages, rendez-vous et publications liés à votre compte. Aucun mot de passe ni aucune moyenne n’y figure.</p>
        {activity.loading ? <LoadingState label="Chargement de l’historique…" /> : null}
        {activity.error ? <ErrorState what="l’historique" error={activity.error} /> : null}
        {activity.data && !activity.data.length ? <EmptyState title="Aucune action enregistrée">Vos prochaines actions apparaîtront ici.</EmptyState> : null}
        {activity.data?.length ? (
          <ol className="list-reset">
            {activity.data.map((entry) => (
              <li key={entry.id} className="deadline-row deadline-row-wide">
                <span className="small">
                  <time dateTime={entry.at}>
                    {formatDate(entry.at)}
                    <br />
                    <span className="muted">à {formatHour(entry.at)}</span>
                  </time>
                </span>
                <span className="small">
                  {entry.description}
                  {entry.actorId !== user.id ? <span className="muted"> · par {entry.actorName}</span> : null}
                </span>
                <Status tone={entry.type.includes('retire') ? 'warning' : entry.type === 'fiche_publiee' || entry.type === 'rdv_accepte' ? 'success' : 'neutral'}>
                  {TYPE_LABELS[entry.type]}
                </Status>
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    </div>
  )
}
