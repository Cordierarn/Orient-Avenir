import { ArrowRight, CalendarDays, Info } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useCurrentUser } from '../../auth/AuthContext'
import { Avatar, Button, EmptyState, ErrorState, LoadingState, Modal, Status, Tag, useToast } from '../../components'
import { deadlineRepo, errorMessage, formationRepo, institutionRepo } from '../../db/repositories'
import { useRepo } from '../../hooks/useRepo'
import { usePageTitle } from '../../hooks/usePageTitle'
import { formatDate, fromIsoDay } from '../../lib/dates'
import { formatNumber } from '../../lib/text'
import type { FormationView, Institution } from '../../types'
import { FormationDetail } from '../student/FormationParts'

const cityLabel = { grande: 'Grande ville', moyenne: 'Ville moyenne', petite: 'Petite ville' }

const eventDate = (date: string, endDate?: string) => {
  const start = fromIsoDay(date)
  const fmt = (d: Date, withYear: boolean) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) })
  if (!endDate) return fmt(start, true)
  const end = fromIsoDay(endDate)
  return `${start.getDate()}–${fmt(end, true)}`
}

interface SchoolViewProps {
  institutionId: string
  /** Aperçu établissement : actions des lycéens désactivées. */
  preview?: boolean
}

/** Page publique de l'établissement, telle que la voient les lycéens. */
export const SchoolView = ({ institutionId, preview }: SchoolViewProps) => {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const location = useLocation()
  const { notify } = useToast()
  const institution = useRepo(() => institutionRepo.getInstitution(institutionId), [institutionId])
  const formations = useRepo(async () => (await formationRepo.listPublished()).filter((f) => f.institutionId === institutionId), [institutionId])
  const [detail, setDetail] = useState<FormationView | null>(null)
  usePageTitle(institution.data?.shortName ?? 'Page de l’école')

  if (institution.loading || formations.loading) return <LoadingState label="Chargement de la page de l’école…" />
  if (institution.error || formations.error) return <ErrorState what="la page de l’école" error={institution.error ?? formations.error} />
  if (!institution.data) return <EmptyState title="Établissement introuvable">Il a peut-être été retiré de la démonstration.</EmptyState>

  const school: Institution = institution.data
  const isStudent = user.role === 'lyceen' && !preview
  const openFormation = (f: FormationView) => (isStudent ? navigate(`/formation/${f.id}`, { state: { background: location } }) : setDetail(f))

  const addEvent = async (eventId: string) => {
    try {
      const result = await deadlineRepo.addInstitutionEvent(user.id, school.id, eventId)
      notify(result.alreadyAdded ? 'Cet événement est déjà dans vos échéances.' : 'Événement ajouté à vos échéances.', result.alreadyAdded ? 'info' : 'success')
    } catch (e) {
      notify(errorMessage(e, 'L’événement n’a pas pu être ajouté. Réessayez.'), 'error')
    }
  }

  return (
    <div className="stack-lg">
      {preview ? (
        <div className="alert">
          <Info className="alert-icon" size={20} aria-hidden="true" />
          <div>
            <p className="alert-title">Vous voyez la page telle que les lycéens la voient</p>
            <p className="small">
              Dernière mise à jour le {formatDate(school.updatedAt)}
              {school.updatedBy ? ` par ${school.updatedBy}` : ''}. Chaque bloc se modifie depuis « Mes fiches ».
            </p>
          </div>
        </div>
      ) : null}
      <section className="card card-lg spread" style={{ alignItems: 'flex-start' }}>
        <div className="stack-sm">
          <p className="overline accent">{school.kind} · établissement fictif</p>
          <h1 className="display" style={{ fontSize: 'clamp(28px, 4vw, 36px)', lineHeight: 1.2 }}>
            {school.shortName}
          </h1>
          <p className="small muted">
            {[cityLabel[school.citySize], school.studentsCount ? `${formatNumber(school.studentsCount)} étudiants` : null, school.tagline].filter(Boolean).join(' · ')}
          </p>
          <p className="small muted">
            {school.sector === 'public' ? 'Public' : 'Privé'} · {school.city}, à {school.distanceKm} km de Valmont
          </p>
        </div>
        <div className="stack-sm">
          <Button
            variant="secondary"
            onClick={() => document.getElementById('rencontrer')?.scrollIntoView({ behavior: 'smooth' })}
            icon={<CalendarDays size={18} aria-hidden="true" />}
          >
            Voir les portes ouvertes
          </Button>
        </div>
      </section>

      <section className="stack" aria-labelledby="parcours-title">
        <h2 id="parcours-title" className="h1">
          Nos parcours d’admission
        </h2>
        {formations.data?.length ? (
          <div className="grid-3">
            {formations.data.map((f) => (
              <article key={f.id} className="card card-lg stack-sm">
                <h3 className="h2">{f.title}</h3>
                <dl className="stack-sm small" style={{ margin: 0 }}>
                  <div>
                    <dt className="overline muted">Prérequis</dt>
                    <dd style={{ margin: 0 }}>{f.prerequisites ?? (f.specialites.length ? `Spécialités conseillées : ${f.specialites.join(', ')}` : 'Toutes spécialités')}</dd>
                  </div>
                  <div>
                    <dt className="overline muted">Effectif</dt>
                    <dd style={{ margin: 0 }}>{formatNumber(f.places)} places</dd>
                  </div>
                  <div>
                    <dt className="overline muted">Débouchés</dt>
                    <dd style={{ margin: 0 }}>{f.outcomes}</dd>
                  </div>
                  <div>
                    <dt className="overline muted">Durée</dt>
                    <dd style={{ margin: 0 }}>{f.durationShort ?? `${f.durationYears} ans`}</dd>
                  </div>
                </dl>
                <button type="button" className="link-button" onClick={() => openFormation(f)}>
                  Voir la fiche<span className="visually-hidden"> {f.title}</span> <ArrowRight size={16} aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState title="Aucune formation publiée">Les fiches en brouillon ne sont pas visibles des lycéens.</EmptyState>
          </div>
        )}
      </section>

      {school.testimonials.length ? (
        <section className="stack" aria-labelledby="temoignages-title">
          <div>
            <h2 id="temoignages-title" className="h1">
              Ils sont passés par là
            </h2>
            <p className="lead">Des étudiants arrivés par des chemins différents. Témoignages fictifs pour la démonstration.</p>
          </div>
          <div className="grid-4">
            {school.testimonials.map((t) => (
              <figure key={t.name} className="card stack-sm" style={{ margin: 0 }}>
                <div className="cluster">
                  <Avatar size="sm" text={t.initials} />
                  <span className="strong small">{t.name}</span>
                </div>
                <Tag>{t.path}</Tag>
                <blockquote className="small" style={{ margin: 0 }}>
                  « {t.quote} »
                </blockquote>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      <section id="rencontrer" className="card card-lg" aria-labelledby="rencontrer-title" style={{ scrollMarginTop: 16 }}>
        <h2 id="rencontrer-title" className="h2" style={{ marginBottom: 8 }}>
          Rencontrer l’école
        </h2>
        {school.events.length ? (
          <ul className="list-reset">
            {school.events.map((e) => (
              <li key={e.id} className="deadline-row deadline-row-wide">
                <span className="date-chip">{eventDate(e.date, e.endDate)}</span>
                <span>
                  <span className="strong">{e.title}</span>
                  <br />
                  <span className="small muted">{e.subtitle}</span>
                </span>
                <span className="cluster">
                  <Status>{e.kind}</Status>
                  <Button
                    variant="secondary"
                    disabled={!isStudent}
                    title={isStudent ? undefined : 'Action disponible côté lycéen'}
                    onClick={() => void addEvent(e.id)}
                  >
                    Ajouter à mes échéances<span className="visually-hidden"> : {e.title}</span>
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Aucun événement annoncé pour le moment.</p>
        )}
        {!isStudent ? <p className="small muted" style={{ marginTop: 12 }}>Aperçu : les lycéens peuvent ajouter ces événements à leurs échéances.</p> : null}
      </section>
      <Modal open={Boolean(detail)} overline={detail?.typeLong} title={detail?.title ?? ''} onClose={() => setDetail(null)} size="wide" fullscreenOnMobile>
        {detail ? <FormationDetail formation={detail} useGrades /> : null}
      </Modal>
    </div>
  )
}

/** /ecole/:id : page publique d'un établissement. */
export const SchoolPage = () => {
  const { id } = useParams()
  return <div className="container page">{id ? <SchoolView institutionId={id} /> : null}</div>
}
