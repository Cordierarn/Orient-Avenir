import { AlertTriangle, ArrowRight, CalendarDays, Lightbulb, Search, ShieldCheck, Star, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useCurrentUser } from '../../auth/AuthContext'
import { Alert, Avatar, Button, EmptyState, ErrorState, Field, LinkButton, LoadingState, Modal, RadioGroup, Status, type StatusTone } from '../../components'
import { cityLabels, domains, durationLabels, learningLabels, levelLabels } from '../../data/domains'
import { AccessDeniedError, counselorRepo, errorMessage } from '../../db/repositories'
import { FOLLOW_STATUSES, followLabel, type CounselorDossier } from '../../db/repositories/counselorRepository'
import { useAction, useRepo } from '../../hooks/useRepo'
import { usePageTitle } from '../../hooks/usePageTitle'
import { formatDate, formatSlot } from '../../lib/dates'
import { normalizeText } from '../../lib/text'
import type { FollowStatus, PublicUser } from '../../types'
import { Conversation } from '../shared/Conversation'

const statusTone: Record<FollowStatus, StatusTone> = {
  a_contacter: 'neutral',
  rdv_demande: 'info',
  entretien_planifie: 'success',
  suivi_en_cours: 'neutral',
}

const Dossier = ({ user, dossier }: { user: PublicUser; dossier: CounselorDossier }) => {
  const { student, profile } = dossier
  const [note, setNote] = useState(dossier.note?.body ?? '')
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [statusOpen, setStatusOpen] = useState(false)
  const [nextStatus, setNextStatus] = useState<FollowStatus>(dossier.status)
  const [chatOpen, setChatOpen] = useState(false)

  const appointment = dossier.appointment
  const planned = appointment?.status === 'planifie'

  const save = useAction(async () => {
    setError('')
    try {
      await counselorRepo.saveNote(user.id, student.id, note, planned ? 'entretien_planifie' : undefined)
      setSaved(planned ? `Entretien planifié le ${formatSlot(appointment!.startsAt)}. La note reste visible par vous seul.` : 'La note reste visible par vous seul.')
    } catch (e) {
      setError(errorMessage(e, 'La note n’a pas pu être enregistrée. Votre texte est conservé : réessayez.'))
    }
  })

  const changeStatus = useAction(async () => {
    setError('')
    try {
      await counselorRepo.saveNote(user.id, student.id, note, nextStatus)
      setStatusOpen(false)
      setSaved(`Statut mis à jour : ${followLabel(nextStatus)}.`)
    } catch (e) {
      setError(errorMessage(e, 'Le statut n’a pas pu être modifié. Réessayez.'))
    }
  })

  const interests = domains
    .filter((d) => profile.interests[d.id] !== undefined)
    .sort((a, b) => (profile.interests[b.id] ?? 0) - (profile.interests[a.id] ?? 0))
    .slice(0, 5)

  return (
    <section className="card card-lg stack" aria-labelledby="dossier-title">
      {saved ? (
        <Alert tone="success" title="Note enregistrée" role="status">
          {saved}
        </Alert>
      ) : null}
      {error ? <Alert tone="error" title="Enregistrement impossible" role="alert">{error}</Alert> : null}
      <div className="spread">
        <div className="cluster" style={{ flexWrap: 'nowrap' }}>
          <Avatar size="lg" text={student.initials} />
          <div>
            <h2 id="dossier-title" className="h1">
              {student.name}
            </h2>
            <p className="small muted">
              {student.classe} · dossier partagé le {dossier.sharedAt ? formatDate(dossier.sharedAt) : '—'}
            </p>
          </div>
        </div>
        <Status tone={statusTone[dossier.status]}>{dossier.statusLabel}</Status>
      </div>
      <div className="grid-2">
        <div className="card card-flat stack-sm">
          <h3 className="h3">Intérêts déclarés</h3>
          {interests.length ? (
            interests.map((d) => (
              <div key={d.id}>
                <div className="criteria-row-head" style={{ fontWeight: 400, fontFamily: 'var(--font-body)' }}>
                  <span className="strong">{d.label}</span>
                  <span className="muted">{levelLabels[profile.interests[d.id]!]}</span>
                </div>
                <div className="criteria-bar" aria-hidden="true">
                  <div className="criteria-fill" style={{ width: `${(profile.interests[d.id]! / 5) * 100}%` }} />
                </div>
              </div>
            ))
          ) : (
            <p className="small muted">Non renseignés.</p>
          )}
        </div>
        <div className="card card-flat stack-sm">
          <h3 className="h3">Préférences</h3>
          <dl className="stack-sm small" style={{ margin: 0 }}>
            {[
              ['Spécialités', profile.specialites.join(', ') || 'Non renseignées'],
              ['Ville', profile.city ? cityLabels[profile.city] : 'Non renseignée'],
              ['Durée', profile.duration ? durationLabels[profile.duration] : 'Non renseignée'],
              ['Apprentissage', profile.learning ? learningLabels[profile.learning] : 'Non renseigné'],
              ['Alternance', profile.alternance ? 'Intéressé·e' : 'Pas prioritaire'],
            ].map(([k, v]) => (
              <div key={k} className="surface-2 spread" style={{ padding: '6px 10px' }}>
                <dt className="muted">{k}</dt>
                <dd className="strong" style={{ margin: 0 }}>
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="card card-flat stack-sm">
        <h3 className="h3">Favoris et notes de l’élève</h3>
        {dossier.favorites.length ? (
          <ul className="list-reset stack-sm">
            {dossier.favorites.map(({ formation, note: studentNote }) => (
              <li key={formation.id}>
                <p className="strong cluster" style={{ gap: 6 }}>
                  <Star size={16} aria-hidden="true" className="accent" fill="currentColor" /> {formation.title}
                </p>
                <p className="small muted">{studentNote ? `« ${studentNote} »` : 'Pas de note.'}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="small muted">Aucun favori partagé.</p>
        )}
      </div>
      <div className="card card-flat spread">
        <span className="cluster" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
          <CalendarDays size={18} aria-hidden="true" className="accent" style={{ flex: 'none', marginTop: 2 }} />
          <span>
            {appointment ? (
              <>
                <span className="strong">
                  Rendez-vous : {formatSlot(appointment.startsAt)} · {appointment.format === 'visio' ? 'visio' : 'chat écrit'}
                  {appointment.status === 'termine' ? ' (terminé)' : ''}
                </span>
                <br />
                <span className="small muted">Créneau choisi parmi les disponibilités proposées par {student.firstName}.</span>
              </>
            ) : dossier.pendingRequest ? (
              <>
                <span className="strong">Rendez-vous demandé : {dossier.pendingRequest.slots.length} créneaux proposés</span>
                <br />
                <span className="small muted">Choisissez un créneau dans « Demandes ».</span>
              </>
            ) : (
              <span className="small muted">Aucun rendez-vous pour le moment.</span>
            )}
          </span>
        </span>
        {appointment ? (
          <Button variant="secondary" arrow onClick={() => setChatOpen((v) => !v)} aria-expanded={chatOpen}>
            {chatOpen ? 'Masquer l’échange' : 'Ouvrir l’échange'}
          </Button>
        ) : dossier.pendingRequest ? (
          <LinkButton to="/conseiller/demandes" variant="secondary" arrow>
            Voir la demande
          </LinkButton>
        ) : null}
      </div>
      {chatOpen ? (
        <div className="card card-flat stack-sm">
          <h3 className="h3">Échange avec {student.firstName}</h3>
          <Conversation actorId={user.id} otherId={student.id} otherFirstName={student.firstName} myFirstName={user.firstName} />
        </div>
      ) : null}
      <div className="surface-warn stack-sm">
        <h3 className="h3 cluster" style={{ color: 'var(--color-warn-ink)', gap: 6 }}>
          <AlertTriangle size={18} aria-hidden="true" /> Points à discuter
        </h3>
        <ul className="small stack-sm" style={{ margin: 0, paddingLeft: 18 }}>
          {dossier.talkingPoints.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
      <div className="surface-2 stack-sm">
        <h3 className="h3 cluster" style={{ gap: 6 }}>
          <Lightbulb size={18} aria-hidden="true" className="accent" /> Questions pour l’entretien
        </h3>
        <p className="small muted">Proposées à partir du dossier, à adapter librement.</p>
        <ol className="small stack-sm" style={{ margin: 0, paddingLeft: 18 }}>
          {dossier.questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      </div>
      <Field label="Note de suivi (visible par vous seul)">
        <textarea className="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="cluster">
        <Button loading={save.pending} loadingLabel="Enregistrement…" onClick={() => void save.run()}>
          {planned ? 'Enregistrer et planifier l’entretien' : 'Enregistrer la note'}
        </Button>
        <Button variant="secondary" onClick={() => setStatusOpen(true)}>
          Changer le statut
        </Button>
      </div>
      <p className="small muted cluster">
        <ShieldCheck size={16} aria-hidden="true" /> Les pistes sont un support de discussion. La décision appartient à l’élève et à sa famille.
      </p>
      <Modal
        open={statusOpen}
        title="Changer le statut"
        description={`Statut de suivi de ${student.firstName}, visible par vous seul.`}
        onClose={() => setStatusOpen(false)}
        footer={
          <>
            <Button loading={changeStatus.pending} onClick={() => void changeStatus.run()}>
              Enregistrer le statut
            </Button>
            <Button variant="secondary" onClick={() => setStatusOpen(false)}>
              Annuler
            </Button>
          </>
        }
      >
        <RadioGroup legend="Statut" name="follow" value={nextStatus} onChange={setNextStatus} options={FOLLOW_STATUSES} legendClassName="visually-hidden" />
      </Modal>
    </section>
  )
}

const DossierLoader = ({ user, studentId }: { user: PublicUser; studentId: string }) => {
  const dossier = useRepo(() => counselorRepo.getStudentDossier(user.id, studentId), [user.id, studentId])
  usePageTitle(dossier.data ? `Dossier de ${dossier.data.student.name}` : 'Dossier élève')
  if (dossier.loading) return <LoadingState label="Chargement du dossier…" />
  if (dossier.error instanceof AccessDeniedError) {
    return (
      <div className="card card-lg stack">
        <Alert tone="warning" title="Dossier inaccessible" role="alert">
          {dossier.error.message} Les données de l’élève ne sont plus affichées.
        </Alert>
        <LinkButton to="/conseiller/eleves" variant="secondary">
          Retour à la liste
        </LinkButton>
      </div>
    )
  }
  if (dossier.error || !dossier.data) return <ErrorState what="le dossier" error={dossier.error} />
  // Remonté à chaque élève : la saisie en cours ne passe jamais d'un dossier à l'autre.
  return <Dossier key={studentId} user={user} dossier={dossier.data} />
}

export const StudentsPage = () => {
  usePageTitle('Mes élèves')
  const user = useCurrentUser()
  const { id } = useParams()
  const students = useRepo(() => counselorRepo.listStudentsForCounselor(user.id), [user.id])
  const [query, setQuery] = useState('')

  if (students.loading) return <div className="container page"><LoadingState label="Chargement de vos élèves…" /></div>
  if (students.error || !students.data) return <div className="container page"><ErrorState what="vos élèves" error={students.error} /></div>

  const list = students.data
  if (!id && list.length && window.matchMedia?.('(min-width: 961px)').matches) return <Navigate to={`/conseiller/eleves/${list[0].id}`} replace />
  const filtered = list.filter((s) => normalizeText(`${s.name} ${s.classe} ${s.specialites.join(' ')}`).includes(normalizeText(query)))
  const requested = list.filter((s) => s.status === 'rdv_demande').length

  return (
    <div className="container page">
      <div className="page-header">
        <h1 className="h1">Mes élèves</h1>
        <p className="lead">
          {list.length} dossier{list.length > 1 ? 's' : ''} partagé{list.length > 1 ? 's' : ''} · {requested} rendez-vous demandé{requested > 1 ? 's' : ''}. Préparez chaque
          entretien à partir du profil de l’élève.
        </p>
      </div>
      <div className="layout-aside-left">
        <aside className="card stack-sm" aria-labelledby="list-title">
          <div className="input-icon">
            <Search size={18} aria-hidden="true" />
            <label htmlFor="student-search" className="visually-hidden">
              Rechercher un élève
            </label>
            <input id="student-search" className="input" type="search" placeholder="Rechercher un élève" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <h2 id="list-title" className="overline muted" style={{ marginTop: 8 }}>
            Dossiers partagés
          </h2>
          {!list.length ? (
            <EmptyState icon={<Users size={20} />} title="Aucun dossier partagé">
              Les élèves qui partagent leur dossier avec vous apparaîtront ici.
            </EmptyState>
          ) : !filtered.length ? (
            <p className="small muted" role="status">
              Aucun élève ne correspond à « {query} ».
            </p>
          ) : (
            <ul className="list-reset stack-sm">
              {filtered.map((s) => (
                <li key={s.id}>
                  <Link to={`/conseiller/eleves/${s.id}`} className="list-item-button stack-sm" aria-current={s.id === id ? 'page' : undefined} style={{ gap: 4, display: 'flex' }}>
                    <span className="strong">{s.name}</span>
                    <span className="small muted">
                      {s.classe}
                      {s.specialites.length ? ` · ${s.specialites.join(', ')}` : ''}
                    </span>
                    <span>
                      <Status tone={statusTone[s.status]}>{s.statusLabel}</Status>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="small muted">Seuls les élèves qui ont donné leur accord apparaissent ici.</p>
        </aside>
        <div>
          {id ? (
            <DossierLoader user={user} studentId={id} />
          ) : list.length ? (
            <div className="card">
              <EmptyState title="Choisissez un élève">
                Sélectionnez un dossier dans la liste pour préparer l’entretien. <ArrowRight size={14} aria-hidden="true" />
              </EmptyState>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
