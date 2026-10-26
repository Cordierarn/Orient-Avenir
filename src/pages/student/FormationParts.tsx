import { AlertTriangle, BarChart3, Building2, CalendarDays, Clock, FileText, MapPin, ShieldCheck, Users } from 'lucide-react'
import { CriteriaBar, Status, Tag, type StatusTone } from '../../components'
import { domainLabel } from '../../data/domains'
import { formatDate, formatLongDate } from '../../lib/dates'
import { formatNumber } from '../../lib/text'
import type { FormationScore, FormationView, Selectivity } from '../../types'

export const selectivityTone: Record<Selectivity, StatusTone> = {
  'acces-ouvert': 'neutral',
  selective: 'neutral',
  'tres-selective': 'neutral',
}

export const selectivityShort: Record<Selectivity, string> = {
  'acces-ouvert': 'Accès ouvert',
  selective: 'Sélective',
  'tres-selective': 'Très sélective',
}

export const cityText = { grande: 'grande ville', moyenne: 'ville moyenne', petite: 'petite ville' }

export const SelectivityStatus = ({ formation }: { formation: Pick<FormationView, 'selectivity'> }) => (
  <Status tone={selectivityTone[formation.selectivity]}>{selectivityShort[formation.selectivity]}</Status>
)

export const SectorStatus = ({ formation }: { formation: FormationView }) => (
  <Status tone="info">{formation.institution.sector === 'public' ? 'Public' : 'Privé'}</Status>
)

/** « Pourquoi cette piste ? » : poids de chaque critère dans l'affinité, jamais une chance d'admission. */
export const WhyBlock = ({ score, title = 'Pourquoi cette piste ?', notes = true }: { score: FormationScore; title?: string; notes?: boolean }) => (
  <div className="surface-2 stack-sm">
    <h4 className="h3" style={{ fontSize: 15 }}>
      {title}
    </h4>
    <div className="criteria">
      <CriteriaBar label="Vos intérêts" value={score.shares.interests} note={notes ? score.interests.explanation : undefined} />
      <CriteriaBar label="Vos spécialités" value={score.shares.specialites} note={notes ? score.specialites.explanation : undefined} />
      <CriteriaBar label="Vos préférences" value={score.shares.preferences} note={notes ? score.preferences.explanation : undefined} />
    </div>
  </div>
)

/** Repères des années passées : séparés de l'affinité, avec leur avertissement. */
export const PastFigures = ({ formation, useGrades, compact }: { formation: FormationView; useGrades: boolean; compact?: boolean }) => (
  <div className="card card-flat stack-sm" style={{ padding: 14 }}>
    <h4 className="h3 cluster" style={{ fontSize: 14, gap: 6 }}>
      <BarChart3 size={16} aria-hidden="true" className="accent" /> Repères de l’an dernier
    </h4>
    <p className="small">
      Places : {formatNumber(formation.places)} · Candidats : {formatNumber(formation.candidates)}
    </p>
    {useGrades ? (
      <p className="small strong">Profils proches du vôtre ayant reçu une proposition : {formation.closeProfilesRange}</p>
    ) : (
      <p className="small muted">Renseignez votre dossier (facultatif) pour afficher le repère « profils proches ».</p>
    )}
    {compact ? null : <p className="small muted">Estimation sur 2025 et 2026, données fictives. Ni une promesse, ni un refus.</p>}
  </div>
)

export const Vigilance = ({ text, title }: { text: string; title?: string }) => (
  <div className="surface-warn cluster" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', padding: 12 }}>
    <AlertTriangle size={18} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
    <div>
      {title ? <p className="strong">{title}</p> : <span className="visually-hidden">Point de vigilance : </span>}
      <p className="small">{text}</p>
    </div>
  </div>
)

const weightLabel = (weight: number) => (weight >= 25 ? 'Poids fort' : weight >= 15 ? 'Poids moyen' : 'Poids faible')
const weightTone = (weight: number): StatusTone => (weight >= 25 ? 'info' : 'neutral')

/** Fiche formation complète (modale desktop, plein écran mobile). */
export const FormationDetail = ({ formation, score, useGrades }: { formation: FormationView; score?: FormationScore; useGrades: boolean }) => (
  <div className="stack">
    <p className="small muted">
      {formation.institution.name} · fiche mise à jour par l’établissement le {formatDate(formation.updatedAt)}
    </p>
    <dl className="kv-grid" style={{ margin: 0 }}>
      <div className="kv">
        <dt>Durée</dt>
        <dd>{formation.durationLabel}</dd>
      </div>
      <div className="kv">
        <dt>Sélectivité</dt>
        <dd>{formation.selectivityLabel}</dd>
      </div>
      <div className="kv">
        <dt>Alternance</dt>
        <dd>{formation.alternanceLabel}</dd>
      </div>
      <div className="kv">
        <dt>Part de pratique</dt>
        <dd>{formation.practicePercent} %</dd>
      </div>
      <div className="kv">
        <dt>Spécialités conseillées</dt>
        <dd>{formation.specialites.length ? formation.specialites.slice(0, 2).join(', ') : 'Toutes'}</dd>
      </div>
      <div className="kv">
        <dt>Lieu</dt>
        <dd>
          {formation.institution.city}, {cityText[formation.institution.citySize]}
        </dd>
      </div>
    </dl>
    <section className="stack-sm">
      <h3 className="h3">En bref</h3>
      <p>{formation.summary}</p>
    </section>
    <section className="stack-sm">
      <h3 className="h3">Débouchés et poursuites</h3>
      <p>{formation.outcomes || 'Non renseigné'}</p>
    </section>
    <Vigilance title="Point de vigilance" text={formation.vigilance || 'Non renseigné'} />
    {score ? <WhyBlock score={score} title="Pourquoi cette piste pour vous ?" /> : null}
    <section className="card card-flat stack-sm" aria-labelledby={`criteria-${formation.id}`}>
      <h3 id={`criteria-${formation.id}`} className="h3 cluster" style={{ gap: 6 }}>
        <FileText size={18} aria-hidden="true" className="accent" /> Comment les dossiers sont examinés
      </h3>
      <p className="small muted">Critères déclarés par l’établissement, avec leur poids. Ils servent à comprendre, pas à se juger.</p>
      <ul className="list-reset stack-sm">
        {formation.criteria.map((criterion) => (
          <li key={criterion.label} className="surface-2 spread" style={{ padding: '8px 12px' }}>
            <span className="small">{criterion.label}</span>
            <Status tone={weightTone(criterion.weight)}>
              {weightLabel(criterion.weight)} · {criterion.weight} %
            </Status>
          </li>
        ))}
      </ul>
      <p className="small muted">
        Source : {formation.institution.name} (fictif), critères mis à jour le {formatDate(formation.updatedAt)}.
      </p>
    </section>
    <section className="card card-flat stack-sm" aria-labelledby={`past-${formation.id}`}>
      <h3 id={`past-${formation.id}`} className="h3 cluster" style={{ gap: 6 }}>
        <BarChart3 size={18} aria-hidden="true" className="accent" /> Repères des années passées
      </h3>
      <dl className="kv-grid" style={{ margin: 0 }}>
        <div className="kv">
          <dt>Places</dt>
          <dd>{formatNumber(formation.places)}</dd>
        </div>
        <div className="kv">
          <dt>Candidats en 2026</dt>
          <dd>{formatNumber(formation.candidates)}</dd>
        </div>
        <div className="kv">
          <dt>Profils proches retenus</dt>
          <dd>{useGrades ? formation.closeProfilesRange : 'Dossier non renseigné'}</dd>
        </div>
      </dl>
      <p className="small muted">
        « Profils proches » : lycéens aux spécialités et résultats comparables aux vôtres, sur 2025 et 2026 (données fictives). La marge d’erreur est importante : ce
        chiffre aide à équilibrer votre liste, il ne remplace pas la décision de l’établissement.
      </p>
    </section>
    <div className="cluster small muted">
      <Tag>
        <MapPin size={14} aria-hidden="true" /> À {formation.institution.distanceKm} km de Valmont
      </Tag>
      <Tag>
        <Users size={14} aria-hidden="true" /> {formatNumber(formation.places)} places
      </Tag>
      <Tag>
        <Building2 size={14} aria-hidden="true" /> {formation.institution.sector === 'public' ? 'Public' : 'Privé'}
      </Tag>
      {formation.tags.map((tag) => (
        <Tag key={tag}>{domainLabel(tag)}</Tag>
      ))}
    </div>
    <p className="small muted cluster" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
      <ShieldCheck size={16} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
      Formation fictive de démonstration. Cette fiche ne garantit aucune admission : pour candidater, utilisez la plateforme officielle.
    </p>
  </div>
)

export const OpenDayBox = ({ formation, onAdd, disabled }: { formation: FormationView; onAdd?: () => void; disabled?: boolean }) =>
  formation.openDay ? (
    <div className="surface-info spread">
      <span className="cluster" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
        <CalendarDays size={18} aria-hidden="true" className="accent" style={{ flex: 'none', marginTop: 2 }} />
        <span>
          <span className="strong">Portes ouvertes : {formatLongDate(formation.openDay.date)}</span>
          <br />
          <span className="small muted">{formation.openDay.details}</span>
        </span>
      </span>
      {onAdd ? (
        <button type="button" className="btn btn-secondary" onClick={onAdd} disabled={disabled}>
          Ajouter à mes échéances
        </button>
      ) : null}
    </div>
  ) : (
    <p className="small muted cluster">
      <Clock size={16} aria-hidden="true" /> Aucune journée portes ouvertes annoncée pour le moment.
    </p>
  )
