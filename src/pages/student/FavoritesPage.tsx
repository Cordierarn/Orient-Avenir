import { ArrowRight, Check, Clock, Plus, Share2, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../../auth/AuthContext'
import { Alert, Button, Checkbox, CheckItem, EmptyState, ErrorState, IconChip, LinkButton, LoadingState, Modal, Status, useToast } from '../../components'
import { appointmentRepo, errorMessage, favoriteRepo, shareRepo } from '../../db/repositories'
import type { FavoriteView } from '../../db/repositories/favoriteRepository'
import type { StudentRequestView } from '../../db/repositories/appointmentRepository'
import { useAction, useRepo } from '../../hooks/useRepo'
import { usePageTitle } from '../../hooks/usePageTitle'
import { formatDate, formatDayMonth, formatSlot } from '../../lib/dates'
import type { PublicUser } from '../../types'
import { AccountRequiredModal, SwitchSpaceModal } from '../../layouts/AccountModals'

const NoteEditor = ({ userId, favorite }: { userId: string; favorite: FavoriteView }) => {
  const [note, setNote] = useState(favorite.note)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const timer = useRef<number | undefined>(undefined)
  const id = `note-${favorite.id}`

  const save = async (value: string) => {
    setStatus('saving')
    try {
      await favoriteRepo.updateNote(userId, favorite.formationId, value)
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        Ma note personnelle
      </label>
      <textarea
        id={id}
        className="textarea"
        rows={2}
        value={note}
        placeholder="Ce qui compte pour vous, les questions à poser…"
        aria-describedby={`${id}-status`}
        onChange={(e) => {
          const value = e.target.value
          setNote(value)
          setStatus('idle')
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => void save(value), 800)
        }}
        onBlur={() => {
          window.clearTimeout(timer.current)
          if (note !== favorite.note || status === 'error') void save(note)
        }}
      />
      <p id={`${id}-status`} className={`small ${status === 'error' ? 'text-bad' : 'muted'}`} aria-live="polite">
        {status === 'saving' ? 'Enregistrement…' : status === 'saved' ? 'Note enregistrée sur cet appareil.' : status === 'error' ? 'Note non enregistrée : votre texte est conservé, réessayez en quittant le champ.' : ''}
      </p>
    </div>
  )
}

const SharePanel = ({ user }: { user: PublicUser }) => {
  const navigate = useNavigate()
  const { notify } = useToast()
  const shares = useRepo(() => shareRepo.getShares(user.id), [user.id])
  const favorites = useRepo(() => favoriteRepo.listFavorites(user.id), [user.id])
  const [counselor, setCounselor] = useState(false)
  const [schools, setSchools] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [guestFeature, setGuestFeature] = useState<string | null>(null)

  useEffect(() => {
    if (!shares.data) return
    setCounselor(Boolean(shares.data.conseiller?.active))
    setSchools(Boolean(shares.data.etablissements?.active))
  }, [shares.data])

  const save = useAction(async () => {
    setFeedback(null)
    if (user.isGuest) {
      setGuestFeature('Le partage de votre dossier')
      return
    }
    try {
      const wasShared = Boolean(shares.data?.conseiller?.active)
      await shareRepo.setShare(user.id, 'conseiller', counselor)
      await shareRepo.setShare(user.id, 'etablissements', schools)
      const text = counselor
        ? wasShared
          ? 'Vos choix de partage sont enregistrés.'
          : 'Dossier partagé : un conseiller pourra le consulter quand vous demanderez un rendez-vous.'
        : wasShared
          ? 'Partage retiré : les conseillers n’ont plus accès à votre dossier.'
          : 'Votre dossier n’est pas partagé. Cochez « J’accepte ce partage » pour le partager.'
      setFeedback({ tone: counselor || wasShared ? 'success' : 'info', text })
      notify(text, counselor || wasShared ? 'success' : 'info')
    } catch (e) {
      setFeedback({ tone: 'error', text: errorMessage(e, 'Vos choix n’ont pas pu être enregistrés. Rien n’a été partagé : réessayez.') })
    }
  })

  const count = favorites.data?.length ?? 0
  const sharedAt = shares.data?.conseiller?.active ? shares.data.conseiller.grantedAt : undefined

  return (
    <aside className="card card-lg stack sticky" aria-labelledby="share-title">
      <IconChip>
        <Share2 size={20} />
      </IconChip>
      <h2 id="share-title" className="h2">
        Préparer l’échange avec un conseiller
      </h2>
      <p className="small muted">Votre conseiller ne voit que ce que vous choisissez de partager.</p>
      {sharedAt ? <Status tone="success">Dossier partagé le {formatDate(sharedAt)}</Status> : <Status>Non partagé</Status>}
      <div className="stack-sm">
        <p className="small strong">Ce qui sera partagé</p>
        <ul className="check-list">
          <CheckItem>Vos niveaux d’intérêt</CheckItem>
          <CheckItem>Vos spécialités et préférences</CheckItem>
          <CheckItem>
            Vos {count} favori{count > 1 ? 's' : ''} et vos notes
          </CheckItem>
        </ul>
        <p className="small strong">Ce qui n’est jamais partagé</p>
        <ul className="check-list">
          <CheckItem ok={false}>Vos moyennes (utilisées seulement sur votre appareil)</CheckItem>
          <CheckItem ok={false}>Les pistes que vous avez retirées</CheckItem>
        </ul>
      </div>
      {user.isGuest ? (
        <Alert tone="warning" title="Partage indisponible en mode invité">
          Créez un compte pour partager votre dossier : en mode invité, rien ne quitte cet appareil.
        </Alert>
      ) : (
        <div className="surface-2 stack-sm">
          <div>
            <Checkbox label="J’accepte ce partage" checked={counselor} onChange={(e) => setCounselor(e.target.checked)} aria-describedby="share-help" />
            <p id="share-help" className="small muted">
              Vous pourrez le retirer à tout moment.
            </p>
          </div>
          <div>
            <Checkbox label="Visible par les écoles de ma liste" checked={schools} onChange={(e) => setSchools(e.target.checked)} aria-describedby="schools-help" />
            <p id="schools-help" className="small muted">
              Elles voient un profil simplifié (spécialités, intérêts, projet), jamais vos notes.
            </p>
          </div>
        </div>
      )}
      {feedback ? (
        <Alert tone={feedback.tone} role="status">
          {feedback.text}
        </Alert>
      ) : null}
      <Button block loading={save.pending} loadingLabel="Enregistrement…" onClick={() => void save.run()}>
        {sharedAt ? 'Mettre à jour mes choix' : 'Partager mon dossier'}
      </Button>
      <Button variant="secondary" block onClick={() => (user.isGuest ? setGuestFeature('La demande de rendez-vous') : navigate('/rendez-vous'))}>
        Demander un rendez-vous
      </Button>
      <AccountRequiredModal open={Boolean(guestFeature)} feature={guestFeature ?? ''} onClose={() => setGuestFeature(null)} />
    </aside>
  )
}

export const RequestTracking = ({ view, sharedAt }: { view: StudentRequestView; sharedAt?: string }) => {
  const { request, appointment, counselor } = view
  const accepted = request.status === 'acceptee' && appointment
  const formatText = request.format === 'visio' ? 'visio' : request.format === 'chat' ? 'chat écrit' : 'visio ou chat'
  return (
    <ol className="timeline" aria-label="Suivi de votre demande">
      <li>
        <span className={`timeline-icon ${sharedAt ? '' : 'timeline-icon-todo'}`} aria-hidden="true">
          <Check size={14} />
        </span>
        <span className="small">
          <span className="strong">Dossier partagé · {sharedAt ? 'fait' : 'retiré'}</span>
          <br />
          <span className="muted">{sharedAt ? formatDate(sharedAt) : 'Le conseiller n’y a plus accès'}</span>
        </span>
      </li>
      <li>
        <span className="timeline-icon" aria-hidden="true">
          <Check size={14} />
        </span>
        <span className="small">
          <span className="strong">Disponibilités envoyées · fait</span>
          <br />
          <span className="muted">
            {request.slots.length} créneaux, {formatText}
          </span>
        </span>
      </li>
      <li>
        <span className={`timeline-icon ${accepted ? '' : 'timeline-icon-todo'}`} aria-hidden="true">
          {accepted ? <Check size={14} /> : <Clock size={14} />}
        </span>
        <span className="small">
          <span className="strong">
            {accepted ? `Créneau choisi par ${counselor?.name.split(' ')[0]} · fait` : request.status === 'refusee' ? 'Aucun conseiller disponible' : 'Choix du créneau · en attente'}
          </span>
          <br />
          <span className="muted">{accepted ? formatDate(request.updatedAt) : request.status === 'refusee' ? 'Envoyez une nouvelle demande' : 'Un conseiller va répondre'}</span>
        </span>
      </li>
      <li>
        <span className="timeline-icon timeline-icon-todo" aria-hidden="true">
          <Clock size={14} />
        </span>
        <span className="small">
          <span className="strong">Entretien · {accepted ? 'à venir' : 'à planifier'}</span>
          <br />
          <span className="muted">{accepted ? formatSlot(appointment.startsAt) : '—'}</span>
        </span>
      </li>
    </ol>
  )
}

const RequestPanel = ({ user, view }: { user: PublicUser; view: StudentRequestView }) => {
  const { notify } = useToast()
  const shares = useRepo(() => shareRepo.getShares(user.id), [user.id])
  const [confirmRevoke, setConfirmRevoke] = useState(false)
  const [demoSpace, setDemoSpace] = useState(false)
  const sharedAt = shares.data?.conseiller?.active ? shares.data.conseiller.grantedAt : undefined
  const accepted = view.request.status === 'acceptee' && view.appointment
  const counselorFirst = view.counselor?.name.split(' ')[0] ?? view.preferredCounselor?.name.split(' ')[0]

  const revoke = useAction(async () => {
    try {
      await shareRepo.setShare(user.id, 'conseiller', false)
      setConfirmRevoke(false)
      notify('Partage retiré : votre conseiller n’a plus accès à votre dossier.', 'success')
    } catch (e) {
      notify(errorMessage(e, 'Le partage n’a pas pu être retiré. Réessayez.'), 'error')
    }
  })
  const cancel = useAction(async () => {
    try {
      await appointmentRepo.cancelRequest(user.id, view.request.id)
      notify('Votre demande de rendez-vous est annulée.', 'success')
    } catch (e) {
      notify(errorMessage(e, 'La demande n’a pas pu être annulée. Réessayez.'), 'error')
    }
  })

  return (
    <aside className="card card-lg stack sticky" aria-labelledby="request-title">
      <IconChip tone={accepted ? 'ok' : undefined}>{accepted ? <Check size={20} /> : <Clock size={20} />}</IconChip>
      <h2 id="request-title" className="h2">
        {accepted ? 'Rendez-vous confirmé' : view.request.status === 'refusee' ? 'Demande sans réponse' : 'Demande envoyée'}
      </h2>
      {accepted ? (
        <Alert tone="success" title={`${counselorFirst} a accepté votre demande`}>
          {formatSlot(view.appointment!.startsAt).replace(/^./, (c) => c.toUpperCase())}, en {view.appointment!.format === 'visio' ? 'visio' : 'chat écrit'}. Si ce premier
          échange vous convient, il restera votre conseiller.
        </Alert>
      ) : view.request.status === 'refusee' ? (
        <Alert tone="warning" title="Aucun conseiller n’a pu accepter">
          Envoyez une nouvelle demande avec d’autres créneaux.
        </Alert>
      ) : (
        <Alert tone="info" title="En attente de réponse">
          {view.preferredCounselor ? `${view.preferredCounselor.name} va choisir un de vos créneaux.` : 'Un conseiller proposé va choisir un de vos créneaux.'}
        </Alert>
      )}
      {!sharedAt ? (
        <Alert tone="warning" title="Partage retiré">
          Votre conseiller ne voit plus votre dossier ni votre demande. Vous pouvez le partager à nouveau ci-dessous.
        </Alert>
      ) : null}
      <p className="small strong">Suivi de votre demande</p>
      <RequestTracking view={view} sharedAt={sharedAt} />
      {accepted ? (
        <>
          <LinkButton to="/echange" block arrow>
            Ouvrir l’échange avec {counselorFirst}
          </LinkButton>
          <Button variant="secondary" block onClick={() => setDemoSpace(true)}>
            Voir côté conseiller (démo)
          </Button>
        </>
      ) : view.request.status === 'en_attente' ? (
        <Button variant="secondary" block onClick={() => void cancel.run()} loading={cancel.pending}>
          Annuler la demande
        </Button>
      ) : (
        <LinkButton to="/rendez-vous" block arrow>
          Envoyer une nouvelle demande
        </LinkButton>
      )}
      {sharedAt ? (
        <Button variant="ghost" block onClick={() => setConfirmRevoke(true)}>
          Retirer le partage
        </Button>
      ) : (
        <Button
          variant="ghost"
          block
          onClick={async () => {
            await shareRepo.setShare(user.id, 'conseiller', true)
            notify('Dossier partagé à nouveau avec votre conseiller.', 'success')
          }}
        >
          Partager à nouveau mon dossier
        </Button>
      )}
      <Modal
        open={confirmRevoke}
        title="Retirer le partage ?"
        description="Votre conseiller n’aura immédiatement plus accès à votre dossier, à vos favoris ni à vos notes. Vos données restent sur cet appareil."
        onClose={() => setConfirmRevoke(false)}
        footer={
          <>
            <Button variant="danger" loading={revoke.pending} onClick={() => void revoke.run()}>
              Retirer le partage
            </Button>
            <Button variant="secondary" onClick={() => setConfirmRevoke(false)} data-autofocus>
              Annuler
            </Button>
          </>
        }
      />
      {demoSpace ? <SwitchSpaceModal role="conseiller" onClose={() => setDemoSpace(false)} /> : null}
    </aside>
  )
}

export const FavoritesPage = () => {
  usePageTitle('Mes favoris')
  const user = useCurrentUser()
  const navigate = useNavigate()
  const location = useLocation()
  const { notify } = useToast()
  const favorites = useRepo(() => favoriteRepo.listFavorites(user.id), [user.id])
  const request = useRepo(() => (user.isGuest ? Promise.resolve(null) : appointmentRepo.getLatestRequest(user.id)), [user.id, user.isGuest])

  const remove = async (favorite: FavoriteView) => {
    try {
      await favoriteRepo.removeFavorite(user.id, favorite.formationId)
      notify(`« ${favorite.formation.title} » retirée de vos favoris.`, 'success')
    } catch (e) {
      notify(errorMessage(e, 'Le favori n’a pas pu être retiré. Réessayez.'), 'error')
    }
  }

  const showRequest = request.data && request.data.request.status !== 'annulee'

  return (
    <div className="container page">
      <div className="page-header">
        <h1 className="h1">Mes favoris</h1>
        <p className="lead">Gardez vos pistes, notez ce qui compte pour vous, puis décidez si vous les partagez.</p>
      </div>
      <div className="layout-aside">
        <section className="stack" aria-label="Formations favorites">
          {favorites.loading ? <LoadingState label="Chargement de vos favoris…" /> : null}
          {favorites.error ? <ErrorState what="vos favoris" error={favorites.error} /> : null}
          {favorites.data && !favorites.data.length ? (
            <div className="card">
              <EmptyState icon={<Star size={20} />} title="Aucun favori pour l’instant" action={<LinkButton to="/pistes" arrow>Explorer les pistes</LinkButton>}>
                Ajoutez des formations depuis « Pistes suggérées » ou « Découverte » pour les retrouver ici avec vos notes.
              </EmptyState>
            </div>
          ) : null}
          {(favorites.data ?? []).map((favorite) => (
            <article key={favorite.id} className="card stack-sm" aria-labelledby={`fav-${favorite.id}`}>
              <div className="spread">
                <span className="overline accent">{favorite.formation.typeShort}</span>
                <Status>Ajouté le {formatDayMonth(favorite.addedAt)}</Status>
              </div>
              <h2 id={`fav-${favorite.id}`} className="h2">
                {favorite.formation.title}
              </h2>
              <p className="small muted">
                {favorite.formation.institution.name} · {favorite.formation.durationYears} ans · {favorite.formation.alternance ? 'alternance possible' : 'sans alternance'}
              </p>
              <NoteEditor userId={user.id} favorite={favorite} />
              <div className="cluster">
                <Button variant="secondary" onClick={() => navigate(`/formation/${favorite.formationId}`, { state: { background: location } })}>
                  Voir la fiche<span className="visually-hidden"> {favorite.formation.title}</span>
                </Button>
                <Button variant="ghost" onClick={() => void remove(favorite)}>
                  Retirer des favoris<span className="visually-hidden"> : {favorite.formation.title}</span>
                </Button>
              </div>
            </article>
          ))}
          {favorites.data?.length ? (
            <div className="card card-dashed spread">
              <span className="cluster small muted" style={{ flexWrap: 'nowrap' }}>
                <Plus size={18} aria-hidden="true" /> Ajoutez d’autres pistes depuis « Pistes suggérées » ou la piste d’ouverture.
              </span>
              <Link className="link-button" to="/pistes">
                Explorer les pistes <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          ) : null}
        </section>
        {showRequest ? <RequestPanel user={user} view={request.data!} /> : <SharePanel user={user} />}
      </div>
    </div>
  )
}
