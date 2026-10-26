import { Check, Inbox, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '../../auth/AuthContext'
import { Alert, Avatar, Button, EmptyState, ErrorState, LinkButton, LoadingState, Radio, Status, useToast } from '../../components'
import { domains } from '../../data/domains'
import { appointmentRepo, counselorRepo, errorMessage } from '../../db/repositories'
import type { CounselorRequestView } from '../../db/repositories/counselorRepository'
import { useAction, useRepo } from '../../hooks/useRepo'
import { usePageTitle } from '../../hooks/usePageTitle'
import { formatSlot, formatSlotShort } from '../../lib/dates'
import { initials } from '../../lib/text'

const formatLabel = { visio: 'Visio', chat: 'Chat écrit', indifferent: 'Visio ou chat' }

const RequestCard = ({ view, counselorId, onAccepted }: { view: CounselorRequestView; counselorId: string; onAccepted: (text: string) => void }) => {
  const { notify } = useToast()
  const [slot, setSlot] = useState(view.request.slots[0])
  const [error, setError] = useState('')
  const { request, student, match } = view

  const accept = useAction(async () => {
    setError('')
    try {
      await appointmentRepo.acceptRequest(counselorId, request.id, slot)
      const text = `Rendez-vous confirmé avec ${student.firstName} : ${formatSlot(slot)}. ${student.firstName} le voit dans son espace.`
      onAccepted(text)
      notify(text, 'success')
    } catch (e) {
      setError(errorMessage(e, 'Le créneau n’a pas pu être accepté. Réessayez.'))
    }
  })
  const decline = useAction(async () => {
    setError('')
    try {
      const status = await appointmentRepo.declineRequest(counselorId, request.id)
      notify(
        status === 'refusee'
          ? `Demande de ${student.firstName} laissée : aucun autre conseiller disponible, elle est informée qu’elle peut en envoyer une nouvelle.`
          : `Demande de ${student.firstName} laissée à un autre conseiller.`,
        'success',
      )
    } catch (e) {
      setError(errorMessage(e, 'La demande n’a pas pu être transmise. Réessayez.'))
    }
  })

  return (
    <article className="card card-lg" aria-labelledby={`req-${request.id}`}>
      <div className="request-grid">
        <div className="stack-sm">
          <div className="cluster" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
            <Avatar text={student.initials} />
            <div>
              <h2 id={`req-${request.id}`} className="h3">
                {student.name}
              </h2>
              <p className="small muted">
                {student.classe}
                {student.specialites.length ? ` · ${student.specialites.join(', ')}` : ''}
              </p>
            </div>
          </div>
          <div>
            <Status tone={match.matches ? 'info' : 'neutral'}>{match.label}</Status>
          </div>
          <dl className="stack-sm small" style={{ margin: 0 }}>
            <div>
              <dt className="overline muted">Intérêts forts</dt>
              <dd style={{ margin: 0 }}>{student.strongInterests.join(', ') || 'Non renseignés'}</dd>
            </div>
            <div>
              <dt className="overline muted">Favoris</dt>
              <dd style={{ margin: 0 }}>{student.favoriteTitles.join(', ') || 'Aucun favori'}</dd>
            </div>
            {request.topic ? (
              <div>
                <dt className="overline muted">Souhaite aborder</dt>
                <dd style={{ margin: 0 }}>« {request.topic} »</dd>
              </div>
            ) : null}
          </dl>
        </div>
        <fieldset>
          <legend className="small strong">Créneaux proposés</legend>
          <div className="stack-sm" style={{ gap: 0 }}>
            {request.slots.map((s) => (
              <Radio key={s} name={`slot-${request.id}`} label={formatSlotShort(s)} checked={slot === s} onChange={() => setSlot(s)} />
            ))}
          </div>
          <p className="small muted">Format : {formatLabel[request.format]}</p>
        </fieldset>
        <div className="stack-sm">
          <Button block loading={accept.pending} loadingLabel="Confirmation…" onClick={() => void accept.run()} disabled={decline.pending}>
            Accepter ce créneau
          </Button>
          <LinkButton to={`/conseiller/eleves/${student.id}`} variant="secondary" block>
            Voir le profil complet
          </LinkButton>
          <Button variant="ghost" block onClick={() => void decline.run()} disabled={accept.pending || decline.pending}>
            Laisser à un autre conseiller
          </Button>
          {!match.matches ? <p className="small muted">Un conseiller spécialisé dans ces domaines serait sans doute plus utile à {student.firstName}.</p> : null}
        </div>
      </div>
      {error ? (
        <Alert tone="error" role="alert" title="Action impossible" className="mt">
          {error}
        </Alert>
      ) : null}
    </article>
  )
}

export const RequestsPage = () => {
  usePageTitle('Demandes de rendez-vous')
  const user = useCurrentUser()
  const requests = useRepo(() => counselorRepo.listRequestsForCounselor(user.id), [user.id])
  const profile = useRepo(() => counselorRepo.getOwnCounselorProfile(user.id), [user.id])
  const stats = useRepo(() => counselorRepo.getCounselorStats(user.id), [user.id])
  const [onlyMatch, setOnlyMatch] = useState(false)
  const [formats, setFormats] = useState<Array<'visio' | 'chat'>>([])
  const [confirmation, setConfirmation] = useState('')

  const filtered = (requests.data ?? []).filter((r) => {
    if (onlyMatch && !r.match.matches) return false
    if (formats.length && !formats.some((f) => r.request.format === f || r.request.format === 'indifferent')) return false
    return true
  })
  const domainText = profile.data ? [...profile.data.domains.map((d) => domains.find((x) => x.id === d)!.short), ...profile.data.tags.filter((t) => /ingénieur/i.test(t)).map((t) => t.toLowerCase())] : []
  const toggleFormat = (f: 'visio' | 'chat') => setFormats((current) => (current.includes(f) ? current.filter((x) => x !== f) : [...current, f]))

  return (
    <div className="container page stack">
      <div>
        <h1 className="h1">Demandes de rendez-vous</h1>
        <p className="lead">Les élèves proposent leurs créneaux. Choisissez ceux que vous pouvez accompagner au mieux, selon votre parcours.</p>
      </div>
      {profile.data ? (
        <div className="surface-info spread">
          <div className="cluster" style={{ flexWrap: 'nowrap' }}>
            <Avatar text={initials(user.firstName, user.lastName)} />
            <div>
              <p className="strong">
                {user.firstName} {user.lastName.charAt(0)}. · {profile.data.title.split(',')[0].toLowerCase()}
              </p>
              <p className="small">
                Vos domaines : {[...new Set(domainText)].join(', ')}
                {profile.data.title.includes(',') ? ` (${profile.data.title.split(',').slice(1).join(',').trim()})` : ''} · {stats.data?.followedCount ?? 0} élève
                {(stats.data?.followedCount ?? 0) > 1 ? 's' : ''} suivi{(stats.data?.followedCount ?? 0) > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <LinkButton to="/conseiller/profil" variant="secondary">
            Modifier mon profil
          </LinkButton>
        </div>
      ) : null}
      <div className="cluster" role="group" aria-label="Filtrer les demandes">
        <button type="button" className="chip" aria-pressed={onlyMatch} onClick={() => setOnlyMatch((v) => !v)}>
          {onlyMatch ? <Check size={14} aria-hidden="true" /> : null} Correspond à mes domaines
        </button>
        <button type="button" className="chip" aria-pressed={formats.includes('visio')} onClick={() => toggleFormat('visio')}>
          {formats.includes('visio') ? <Check size={14} aria-hidden="true" /> : null} Visio
        </button>
        <button type="button" className="chip" aria-pressed={formats.includes('chat')} onClick={() => toggleFormat('chat')}>
          {formats.includes('chat') ? <Check size={14} aria-hidden="true" /> : null} Chat écrit
        </button>
      </div>
      {confirmation ? (
        <Alert tone="success" title="Créneau accepté" role="status">
          {confirmation} <Link to="/conseiller/eleves">Voir mes élèves</Link>
        </Alert>
      ) : null}
      {requests.loading ? <LoadingState label="Chargement des demandes…" /> : null}
      {requests.error ? <ErrorState what="les demandes" error={requests.error} /> : null}
      {requests.data && !filtered.length ? (
        <div className="card">
          <EmptyState icon={<Inbox size={20} />} title={requests.data.length ? 'Aucune demande ne correspond à ces filtres' : 'Aucune demande en attente'}>
            {requests.data.length
              ? 'Retirez un filtre pour voir toutes les demandes.'
              : 'Les nouvelles demandes des élèves qui ont partagé leur dossier apparaîtront ici.'}
          </EmptyState>
        </div>
      ) : null}
      <div className="stack">
        {filtered.map((view) => (
          <RequestCard key={view.request.id} view={view} counselorId={user.id} onAccepted={setConfirmation} />
        ))}
      </div>
      <p className="small muted cluster">
        <ShieldCheck size={16} aria-hidden="true" /> Vous ne voyez que ce que chaque élève a choisi de partager. Ses moyennes ne vous sont jamais montrées.
      </p>
    </div>
  )
}
