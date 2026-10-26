import { Building2, Check, Clock, Info, MapPin, Search, SlidersHorizontal, Users } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useCurrentUser } from '../../auth/AuthContext'
import { Button, Checkbox, EmptyState, ErrorState, LoadingState, Modal, Radio, Status, Tag } from '../../components'
import { domainLabel } from '../../data/domains'
import { usePageTitle } from '../../hooks/usePageTitle'
import { usePublishedFormations } from '../../hooks/useStudent'
import { formatDate } from '../../lib/dates'
import { formatNumber, normalizeText } from '../../lib/text'
import type { FormationType, FormationView } from '../../types'
import { FormationDetail } from '../student/FormationParts'

type Sector = 'tous' | 'public' | 'prive'
type Places = 'toutes' | 'moins50' | '50a150' | 'plus150'
type Sort = 'distance' | 'nom' | 'places'

const TYPE_LABELS: Record<FormationType, string> = {
  BUT: 'BUT',
  BTS: 'BTS',
  Licence: 'Licence',
  'École d’ingénieurs': 'École d’ingénieurs',
  Bachelor: 'Bachelor',
  CPGE: 'CPGE',
  'Formation en soins infirmiers': 'Soins infirmiers',
}

const MAX_DISTANCE = 200
const MIN_DISTANCE = 5

const searchable = (f: FormationView) =>
  normalizeText([f.title, f.typeShort, f.typeLong, f.institution.name, f.institution.city, f.summary, f.outcomes, ...f.keywords, ...f.tags.map(domainLabel)].join(' '))

/**
 * Découverte : une seule implémentation pour les trois rôles.
 * Les résultats ne dépendent jamais du profil du compte : ni classés, ni recommandés.
 */
export const DiscoveryPage = () => {
  usePageTitle('Découvrir les formations')
  const user = useCurrentUser()
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const formations = usePublishedFormations()
  const query = params.get('q') ?? ''
  const [draft, setDraft] = useState(query)
  const [distance, setDistance] = useState(MAX_DISTANCE)
  const [sector, setSector] = useState<Sector>('tous')
  const [places, setPlaces] = useState<Places>('toutes')
  const [excludedTypes, setExcludedTypes] = useState<FormationType[]>([])
  const [alternance, setAlternance] = useState(false)
  const [keywords, setKeywords] = useState<string[]>([])
  const [allKeywords, setAllKeywords] = useState(false)
  const [sort, setSort] = useState<Sort>('distance')
  const [detail, setDetail] = useState<FormationView | null>(null)

  const types = useMemo(() => {
    const present = new Set((formations.data ?? []).map((f) => f.typeShort))
    return (Object.keys(TYPE_LABELS) as FormationType[]).filter((t) => present.has(t))
  }, [formations.data])
  const keywordList = useMemo(() => {
    const counts = new Map<string, number>()
    for (const f of formations.data ?? []) for (const k of f.keywords) counts.set(k, (counts.get(k) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr')).map(([k]) => k)
  }, [formations.data])

  const results = useMemo(() => {
    const q = normalizeText(query)
    const terms = q.split(' ').filter(Boolean)
    const rows = (formations.data ?? []).filter((f) => {
      if (terms.length) {
        const text = searchable(f)
        if (!terms.every((t) => text.includes(t))) return false
      }
      if (f.institution.distanceKm > distance) return false
      if (sector !== 'tous' && f.institution.sector !== sector) return false
      if (places === 'moins50' && f.places >= 50) return false
      if (places === '50a150' && (f.places < 50 || f.places > 150)) return false
      if (places === 'plus150' && f.places <= 150) return false
      if (excludedTypes.includes(f.typeShort)) return false
      if (alternance && !f.alternance) return false
      if (keywords.length && !keywords.some((k) => f.keywords.includes(k))) return false
      return true
    })
    const sorters: Record<Sort, (a: FormationView, b: FormationView) => number> = {
      distance: (a, b) => a.institution.distanceKm - b.institution.distanceKm || a.title.localeCompare(b.title, 'fr'),
      nom: (a, b) => a.title.localeCompare(b.title, 'fr'),
      places: (a, b) => b.places - a.places || a.title.localeCompare(b.title, 'fr'),
    }
    return rows.sort(sorters[sort])
  }, [formations.data, query, distance, sector, places, excludedTypes, alternance, keywords, sort])

  const clearAll = () => {
    setDraft('')
    setParams({}, { replace: true })
    setDistance(MAX_DISTANCE)
    setSector('tous')
    setPlaces('toutes')
    setExcludedTypes([])
    setAlternance(false)
    setKeywords([])
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setParams(draft.trim() ? { q: draft.trim() } : {}, { replace: true })
  }

  const openDetail = (f: FormationView) => {
    if (user.role === 'lyceen') navigate(`/formation/${f.id}`, { state: { background: location } })
    else setDetail(f)
  }

  const shownKeywords = allKeywords ? keywordList : keywordList.slice(0, 6)
  const count = `${results.length} formation${results.length > 1 ? 's' : ''}${query ? ` pour « ${query} »` : ''}`

  return (
    <div className="container page stack">
      <div>
        <h1 className="h1">Découvrir les formations</h1>
        <p className="lead">Toutes les formations publiées par les établissements, identiques pour les trois espaces. On y consulte, il n’y a rien à remplir.</p>
      </div>
      <form role="search" className="cluster" style={{ flexWrap: 'nowrap' }} onSubmit={submit}>
        <div className="input-icon" style={{ flex: 1 }}>
          <Search size={18} aria-hidden="true" />
          <label htmlFor="discovery-search" className="visually-hidden">
            Rechercher une formation, un établissement, un mot-clé
          </label>
          <input
            id="discovery-search"
            className="input"
            type="search"
            placeholder="Rechercher une formation, un établissement, un mot-clé"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </div>
        <Button type="submit">Rechercher</Button>
      </form>
      <div className="alert">
        <Info className="alert-icon" size={20} aria-hidden="true" />
        <div>
          <p className="alert-title">À quoi sert cette page ?</p>
          <p className="small">
            Elle présente les formations publiées par les établissements, de la même façon pour les lycéens, les conseillers et les établissements. Vous pouvez chercher et
            filtrer sans rien envoyer. Les résultats ne dépendent pas de votre profil : ils ne sont ni classés ni recommandés.
          </p>
        </div>
      </div>

      <div className="layout-sidebar">
        <aside className="card stack" aria-labelledby="filters-title">
          <div className="spread">
            <h2 id="filters-title" className="h3">
              Filtres
            </h2>
            <button type="button" className="link-button small" onClick={clearAll}>
              Tout effacer
            </button>
          </div>
          <fieldset className="stack-sm">
            <legend className="field-label">Distance</legend>
            <p className="input cluster small" style={{ background: 'var(--color-surface)' }}>
              <MapPin size={16} aria-hidden="true" /> Autour de Valmont
            </p>
            <label htmlFor="distance" className="small strong">
              Jusqu’à {distance} km
            </label>
            <input
              id="distance"
              type="range"
              min={MIN_DISTANCE}
              max={MAX_DISTANCE}
              step={5}
              value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
              aria-valuetext={`Jusqu’à ${distance} kilomètres`}
              style={{ width: '100%', accentColor: 'var(--color-accent)', minHeight: 44 }}
            />
            <div className="spread small muted">
              <span>{MIN_DISTANCE} km</span>
              <span>{MAX_DISTANCE} km</span>
            </div>
          </fieldset>
          <hr className="divider" style={{ margin: 0 }} />
          <fieldset>
            <legend className="field-label">Établissement</legend>
            <div className="stack-sm" style={{ gap: 0 }}>
              {(
                [
                  ['tous', 'Tous'],
                  ['public', 'Public'],
                  ['prive', 'Privé'],
                ] as const
              ).map(([value, label]) => (
                <Radio key={value} name="sector" label={label} checked={sector === value} onChange={() => setSector(value)} />
              ))}
            </div>
          </fieldset>
          <hr className="divider" style={{ margin: 0 }} />
          <fieldset>
            <legend className="field-label">Nombre de places</legend>
            <div className="stack-sm" style={{ gap: 0 }}>
              {(
                [
                  ['toutes', 'Toutes'],
                  ['moins50', 'Moins de 50'],
                  ['50a150', 'De 50 à 150'],
                  ['plus150', 'Plus de 150'],
                ] as const
              ).map(([value, label]) => (
                <Radio key={value} name="places" label={label} checked={places === value} onChange={() => setPlaces(value)} />
              ))}
            </div>
          </fieldset>
          <hr className="divider" style={{ margin: 0 }} />
          <fieldset>
            <legend className="field-label">Type de formation</legend>
            <div className="stack-sm" style={{ gap: 0 }}>
              {types.map((type) => (
                <Checkbox
                  key={type}
                  label={TYPE_LABELS[type]}
                  checked={!excludedTypes.includes(type)}
                  onChange={(e) => setExcludedTypes((current) => (e.target.checked ? current.filter((t) => t !== type) : [...current, type]))}
                />
              ))}
            </div>
          </fieldset>
          <hr className="divider" style={{ margin: 0 }} />
          <fieldset>
            <legend className="field-label">Alternance</legend>
            <Checkbox label="Alternance possible" checked={alternance} onChange={(e) => setAlternance(e.target.checked)} />
          </fieldset>
          <hr className="divider" style={{ margin: 0 }} />
          <fieldset className="stack-sm">
            <legend className="field-label">Mots-clés</legend>
            <div className="cluster">
              {shownKeywords.map((k) => (
                <button
                  key={k}
                  type="button"
                  className="chip"
                  aria-pressed={keywords.includes(k)}
                  onClick={() => setKeywords((current) => (current.includes(k) ? current.filter((x) => x !== k) : [...current, k]))}
                >
                  {keywords.includes(k) ? <Check size={14} aria-hidden="true" /> : null}
                  {k}
                </button>
              ))}
            </div>
            {keywordList.length > 6 ? (
              <button type="button" className="link-button small" aria-expanded={allKeywords} onClick={() => setAllKeywords((v) => !v)}>
                {allKeywords ? 'Moins de mots-clés' : `Plus de mots-clés (${keywordList.length - 6})`}
              </button>
            ) : null}
          </fieldset>
        </aside>

        <section className="stack" aria-labelledby="results-count">
          <div className="spread">
            <h2 id="results-count" className="h3" aria-live="polite">
              {formations.loading ? 'Chargement…' : count}
            </h2>
            <span className="cluster">
              <SlidersHorizontal size={16} aria-hidden="true" />
              <label htmlFor="discovery-sort" className="visually-hidden">
                Trier
              </label>
              <select id="discovery-sort" className="select chip" style={{ width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="distance">Trier : distance</option>
                <option value="nom">Trier : nom</option>
                <option value="places">Trier : nombre de places</option>
              </select>
            </span>
          </div>
          {formations.loading ? <LoadingState label="Chargement des formations publiées…" /> : null}
          {formations.error ? <ErrorState what="les formations publiées" error={formations.error} /> : null}
          {formations.data && !formations.data.length ? (
            <div className="card">
              <EmptyState icon={<Search size={20} />} title="Aucune formation publiée pour le moment">
                Les établissements n’ont encore publié aucune fiche.
              </EmptyState>
            </div>
          ) : null}
          {formations.data?.length && !results.length ? (
            <div className="card">
              <EmptyState
                icon={<Search size={20} />}
                title="Aucune formation ne correspond"
                action={
                  <Button variant="secondary" onClick={clearAll}>
                    Tout effacer
                  </Button>
                }
              >
                Essayez un autre mot, élargissez la distance ou retirez un filtre.
              </EmptyState>
            </div>
          ) : null}
          <div className="grid-2">
            {results.map((f) => (
              <article key={f.id} className="card formation-card" aria-labelledby={`disc-${f.id}`}>
                <div className="spread">
                  <span className="overline accent">{f.typeShort}</span>
                  <Status tone="info">{f.institution.sector === 'public' ? 'Public' : 'Privé'}</Status>
                </div>
                <h3 id={`disc-${f.id}`} className="h2">
                  {f.title}
                </h3>
                <p className="small muted cluster" style={{ gap: 4, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                  <MapPin size={15} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} /> {f.institution.name} · à {f.institution.distanceKm} km
                </p>
                <ul className="list-reset cluster small muted" style={{ columnGap: 12 }}>
                  <li className="cluster" style={{ gap: 4 }}>
                    <Clock size={15} aria-hidden="true" /> {f.durationYears} ans
                  </li>
                  <li className="cluster" style={{ gap: 4 }}>
                    <Users size={15} aria-hidden="true" /> {formatNumber(f.places)} places
                  </li>
                  <li className="cluster" style={{ gap: 4 }}>
                    <Building2 size={15} aria-hidden="true" /> {f.alternance ? 'Alternance' : 'Sans alternance'}
                  </li>
                </ul>
                <div className="cluster">
                  {f.tags.map((t) => (
                    <Tag key={t}>{domainLabel(t)}</Tag>
                  ))}
                </div>
                <p className="small muted">Fiche mise à jour par l’établissement le {formatDate(f.updatedAt)}</p>
                <div className="card-actions">
                  <Button variant="secondary" onClick={() => openDetail(f)}>
                    Voir la fiche<span className="visually-hidden"> {f.title}</span>
                  </Button>
                </div>
              </article>
            ))}
          </div>
          <p className="small muted">Distances à vol d’oiseau depuis Valmont. Formations, chiffres et établissements fictifs, à titre de démonstration.</p>
        </section>
      </div>
      <Modal open={Boolean(detail)} overline={detail?.typeLong} title={detail?.title ?? ''} onClose={() => setDetail(null)} size="wide" fullscreenOnMobile>
        {detail ? <FormationDetail formation={detail} useGrades /> : null}
      </Modal>
    </div>
  )
}
