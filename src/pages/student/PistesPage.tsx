import { Building2, Check, ChevronDown, Clock, Columns2, Compass, Info, MapPin, Search, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../../auth/AuthContext'
import { AffinityDots, Alert, Button, Checkbox, EmptyState, ErrorState, FavoriteToggle, LinkButton, LoadingState, Status, Tag } from '../../components'
import { cityLabels, domainChipLabels } from '../../data/domains'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useComparisonIds, useFavoriteIds, useFormationActions, usePistes } from '../../hooks/useStudent'
import { formatDate } from '../../lib/dates'
import { normalizeText } from '../../lib/text'
import type { FormationScore, FormationView } from '../../types'
import { cityText, PastFigures, SelectivityStatus, Vigilance, WhyBlock } from './FormationParts'

type DurationFilter = 'toutes' | '2' | '3' | '5+'
type SortKey = 'affinite' | 'distance' | 'nom'

/** Domaines de la formation qui recoupent le plus les intérêts du lycéen. */
const topTags = (formation: FormationView, interests: Record<string, number | undefined>) =>
  Object.entries(formation.domainWeights)
    .sort((a, b) => (b[1] ?? 0) * ((interests[b[0]] ?? 1) + 1) - (a[1] ?? 0) * ((interests[a[0]] ?? 1) + 1))
    .slice(0, 2)
    .map(([id]) => id as keyof typeof domainChipLabels)

interface CardProps {
  formation: FormationView
  score: FormationScore
  interests: Record<string, number | undefined>
  favorite: boolean
  compared: boolean
  useGrades: boolean
  onFavorite: () => void
  onCompare: () => void
  onOpen: () => void
}

const PisteCard = ({ formation, score, interests, favorite, compared, useGrades, onFavorite, onCompare, onOpen }: CardProps) => (
  <article className="card formation-card" aria-labelledby={`piste-${formation.id}`}>
    <div className="spread">
      <span className="overline accent">{formation.typeShort}</span>
      <SelectivityStatus formation={formation} />
    </div>
    <h2 id={`piste-${formation.id}`} className="h2">
      {formation.title}
    </h2>
    <ul className="list-reset cluster small muted" style={{ columnGap: 12 }}>
      <li className="cluster" style={{ gap: 4 }}>
        <MapPin size={15} aria-hidden="true" /> {formation.institution.city} · {cityText[formation.institution.citySize]}
      </li>
      <li className="cluster" style={{ gap: 4 }}>
        <Clock size={15} aria-hidden="true" /> {formation.durationYears} ans
      </li>
      <li className="cluster" style={{ gap: 4 }}>
        <Building2 size={15} aria-hidden="true" /> {formation.alternance ? 'Alternance' : 'Sans alternance'}
      </li>
    </ul>
    <div className="cluster">
      {topTags(formation, interests).map((id) => (
        <Tag key={id}>{domainChipLabels[id]}</Tag>
      ))}
    </div>
    <p className="small cluster">
      <span className="strong">Affinité</span> <AffinityDots dots={score.dots} />
    </p>
    <WhyBlock score={score} />
    <PastFigures formation={formation} useGrades={useGrades} />
    <Vigilance text={formation.vigilance} />
    <div className="stack-sm card-actions">
      <div>
        <Button variant="secondary" onClick={onOpen}>
          Voir la fiche
        </Button>
      </div>
      <div className="spread">
        <FavoriteToggle active={favorite} onToggle={onFavorite} />
        <Checkbox label="Comparer" checked={compared} onChange={onCompare} aria-label={`Comparer ${formation.title}`} />
      </div>
    </div>
  </article>
)

export const PistesPage = () => {
  usePageTitle('Vos pistes')
  const user = useCurrentUser()
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, ranked, opening, loading, error } = usePistes(user.id)
  const favorites = useFavoriteIds(user.id)
  const comparison = useComparisonIds(user.id)
  const actions = useFormationActions(user.id)
  const [query, setQuery] = useState('')
  const [duration, setDuration] = useState<DurationFilter>('toutes')
  const [alternanceOnly, setAlternanceOnly] = useState(false)
  const [cityOnly, setCityOnly] = useState(false)
  const [sort, setSort] = useState<SortKey>('affinite')
  const [showOthers, setShowOthers] = useState(false)

  const filtered = useMemo(() => {
    if (!ranked) return []
    const q = normalizeText(query)
    const rows = ranked.filter(({ formation: f }) => {
      if (q && !normalizeText(`${f.title} ${f.institution.name} ${f.keywords.join(' ')}`).includes(q)) return false
      if (duration === '2' && f.durationYears !== 2) return false
      if (duration === '3' && f.durationYears !== 3) return false
      if (duration === '5+' && f.durationYears < 5) return false
      if (alternanceOnly && !f.alternance) return false
      if (cityOnly && profile?.city && profile.city !== 'indifferent' && f.institution.citySize !== profile.city) return false
      return true
    })
    if (sort === 'distance') return [...rows].sort((a, b) => a.formation.institution.distanceKm - b.formation.institution.distanceKm)
    if (sort === 'nom') return [...rows].sort((a, b) => a.formation.title.localeCompare(b.formation.title, 'fr'))
    return rows
  }, [ranked, query, duration, alternanceOnly, cityOnly, sort, profile])

  if (loading) return <div className="container page"><LoadingState label="Calcul de vos pistes…" /></div>
  if (error || !profile || !ranked) return <div className="container page"><ErrorState what="vos pistes" error={error} /></div>

  const favoriteIds = favorites.data ?? []
  const compareIds = comparison.data ?? []
  const answered = Object.keys(profile.interests).length > 0
  const top = filtered.slice(0, 3)
  const others = filtered.slice(3).filter((r) => r.formation.id !== opening?.formation.id)
  const filtersActive = Boolean(query || duration !== 'toutes' || alternanceOnly || cityOnly)
  const open = (id: string) => navigate(`/formation/${id}`, { state: { background: location } })
  const selected = ranked.filter((r) => compareIds.includes(r.formation.id)).map((r) => r.formation.title)
  const cardProps = (formation: FormationView, score: FormationScore) => ({
    formation,
    score,
    interests: profile.interests,
    favorite: actions.isFavorite(formation.id, favoriteIds),
    compared: actions.isCompared(formation.id, compareIds),
    useGrades: profile.useGrades && Object.keys(profile.grades).length > 0,
    onFavorite: () => void actions.toggleFavorite(formation, actions.isFavorite(formation.id, favoriteIds)),
    onCompare: () => void actions.toggleCompare(formation, actions.isCompared(formation.id, compareIds)),
    onOpen: () => open(formation.id),
  })

  return (
    <div className="container page stack">
      <div className="page-header-row" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="h1">
            <span className="desktop-only">Vos pistes à explorer</span>
            <span className="mobile-only">Vos pistes</span>
          </h1>
          <p className="lead">
            Calculées à partir de vos réponses du {formatDate(profile.updatedAt)}. Ce n’est ni un classement officiel ni un avis d’admission.
          </p>
        </div>
        <LinkButton to="/profil/interets" variant="secondary">
          Modifier mes réponses
        </LinkButton>
      </div>

      {!answered ? (
        <Alert tone="warning" title="Vos intérêts ne sont pas encore renseignés">
          Les pistes ci-dessous utilisent des valeurs neutres. <Link to="/profil/interets">Répondez au questionnaire</Link> pour des pistes qui vous ressemblent.
        </Alert>
      ) : null}

      <div className="spread" role="search" aria-label="Filtrer les pistes">
        <div className="cluster">
          <div className="input-icon" style={{ flex: '1 1 220px' }}>
            <Search size={18} aria-hidden="true" />
            <label htmlFor="pistes-search" className="visually-hidden">
              Rechercher une formation
            </label>
            <input id="pistes-search" className="input" type="search" placeholder="Rechercher une formation" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <label className="visually-hidden" htmlFor="pistes-duration">
            Durée
          </label>
          <select id="pistes-duration" className="select chip" style={{ width: 'auto' }} value={duration} onChange={(e) => setDuration(e.target.value as DurationFilter)}>
            <option value="toutes">Durée : toutes</option>
            <option value="2">Durée : 2 ans</option>
            <option value="3">Durée : 3 ans</option>
            <option value="5+">Durée : 5 ans ou plus</option>
          </select>
          <button type="button" className="chip" aria-pressed={alternanceOnly} onClick={() => setAlternanceOnly((v) => !v)}>
            {alternanceOnly ? <Check size={14} aria-hidden="true" /> : null} Alternance possible
          </button>
          {profile.city && profile.city !== 'indifferent' ? (
            <button type="button" className="chip" aria-pressed={cityOnly} onClick={() => setCityOnly((v) => !v)}>
              {cityOnly ? <Check size={14} aria-hidden="true" /> : null} {cityLabels[profile.city]}
            </button>
          ) : null}
        </div>
        <span className="cluster">
          <SlidersHorizontal size={16} aria-hidden="true" />
          <label htmlFor="pistes-sort" className="visually-hidden">
            Trier
          </label>
          <select id="pistes-sort" className="select chip" style={{ width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="affinite">Trier : affinité</option>
            <option value="distance">Trier : distance</option>
            <option value="nom">Trier : nom</option>
          </select>
        </span>
      </div>

      <div className="alert desktop-only">
        <Info className="alert-icon" size={20} aria-hidden="true" />
        <div>
          <p className="alert-title">Comment lire ces pistes ?</p>
          <p className="small">
            Les points (●●●●○) indiquent à quel point une formation recoupe vos réponses. Le bloc « Pourquoi cette piste ? » détaille le poids de chaque critère. L’affinité
            n’est pas une chance d’admission : les repères chiffrés des années passées sont affichés à part, avec leur marge d’erreur.
          </p>
        </div>
      </div>

      <p className="visually-hidden" role="status">
        {filtered.length} piste{filtered.length > 1 ? 's' : ''} affichée{filtered.length > 1 ? 's' : ''}
      </p>

      {top.length ? (
        <div className="grid-3">
          {top.map(({ formation, score }) => (
            <PisteCard key={formation.id} {...cardProps(formation, score)} />
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={<Search size={20} />}
            title="Aucune piste ne correspond à ces filtres"
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery('')
                  setDuration('toutes')
                  setAlternanceOnly(false)
                  setCityOnly(false)
                }}
              >
                Effacer les filtres
              </Button>
            }
          >
            Élargissez la durée ou retirez un filtre : vos réponses ne sont pas modifiées.
          </EmptyState>
        </div>
      )}

      {opening && !filtersActive ? (
        <section className="opening-card" aria-labelledby="opening-title">
          <span className="icon-chip" aria-hidden="true">
            <Compass size={20} />
          </span>
          <div className="stack-sm" style={{ flex: 1 }}>
            <div>
              <Status tone="info">Piste d’ouverture</Status>
            </div>
            <h2 id="opening-title" className="h3">
              {opening.formation.title} · {opening.formation.institution.name}
            </h2>
            <p className="small muted">
              {opening.reason} Affinité : <AffinityDots dots={opening.score.dots} />.
            </p>
          </div>
          <div className="stack-sm">
            <FavoriteToggle
              active={actions.isFavorite(opening.formation.id, favoriteIds)}
              onToggle={() => void actions.toggleFavorite(opening.formation, actions.isFavorite(opening.formation.id, favoriteIds))}
            />
            <Button variant="ghost" onClick={() => open(opening.formation.id)}>
              Voir la fiche
            </Button>
          </div>
        </section>
      ) : null}

      {others.length ? (
        <section className="stack">
          <button type="button" className="link-button" aria-expanded={showOthers} onClick={() => setShowOthers((v) => !v)}>
            <ChevronDown size={18} aria-hidden="true" style={{ transform: showOthers ? 'rotate(180deg)' : undefined }} />
            {showOthers ? 'Masquer les autres pistes' : `Afficher les autres pistes (${others.length})`}
          </button>
          {showOthers ? (
            <ul className="list-reset stack-sm">
              {others.map(({ formation, score }) => (
                <li key={formation.id} className="card spread" style={{ padding: 14 }}>
                  <span className="stack-sm" style={{ gap: 0 }}>
                    <span className="strong">{formation.title}</span>
                    <span className="small muted">
                      {formation.institution.name} · {formation.durationYears} ans · <AffinityDots dots={score.dots} label={false} /> {score.dots} sur 5
                    </span>
                  </span>
                  <span className="cluster">
                    <Button variant="ghost" onClick={() => open(formation.id)}>
                      Voir la fiche
                    </Button>
                    <Checkbox
                      label="Comparer"
                      checked={actions.isCompared(formation.id, compareIds)}
                      onChange={() => void actions.toggleCompare(formation, actions.isCompared(formation.id, compareIds))}
                      aria-label={`Comparer ${formation.title}`}
                    />
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {compareIds.length ? (
        <div className="selection-bar" role="region" aria-label="Sélection pour la comparaison">
          <span className="cluster" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            <Columns2 size={20} aria-hidden="true" style={{ flex: 'none' }} />
            <span>
              <span className="strong">
                {compareIds.length} formation{compareIds.length > 1 ? 's' : ''} sélectionnée{compareIds.length > 1 ? 's' : ''}
              </span>
              <br />
              <span className="small desktop-only">{selected.join(' · ')}</span>
            </span>
          </span>
          <LinkButton to="/comparer" arrow>
            Comparer
          </LinkButton>
        </div>
      ) : null}
    </div>
  )
}
