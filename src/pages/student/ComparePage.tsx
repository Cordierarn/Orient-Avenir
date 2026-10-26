import { ArrowLeft, Columns2, Info, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../../auth/AuthContext'
import { AffinityDots, Alert, Button, EmptyState, ErrorState, FavoriteToggle, LinkButton, LoadingState } from '../../components'
import { comparisonRepo } from '../../db/repositories'
import { useRepo } from '../../hooks/useRepo'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useFavoriteIds, useFormationActions, useOwnProfile } from '../../hooks/useStudent'
import { formatDate } from '../../lib/dates'
import { scoreFormation } from '../../lib/scoring'
import { formatNumber } from '../../lib/text'
import type { FormationView } from '../../types'
import { selectivityShort } from './FormationParts'

interface Row {
  label: string
  value: (f: FormationView) => React.ReactNode
  /** Texte utilisé pour détecter un écart. */
  gap?: (formations: FormationView[]) => boolean
  gapText?: (formations: FormationView[]) => string
}

const distinct = (values: Array<string | number | boolean>) => new Set(values).size > 1

const ROWS: Row[] = [
  { label: 'Établissement', value: (f) => f.institution.shortName },
  {
    label: 'Durée',
    value: (f) => `${f.durationYears} ans`,
    gap: (fs) => distinct(fs.map((f) => f.durationYears)),
    gapText: (fs) => `la durée (${Math.min(...fs.map((f) => f.durationYears))} à ${Math.max(...fs.map((f) => f.durationYears))} ans)`,
  },
  {
    label: 'Sélectivité',
    value: (f) => (f.selectivity === 'acces-ouvert' ? f.selectivityLabel : selectivityShort[f.selectivity]),
    gap: (fs) => distinct(fs.map((f) => f.selectivity)),
    gapText: () => 'la sélectivité',
  },
  { label: 'Places', value: (f) => formatNumber(f.places) },
  { label: 'Candidats l’an dernier', value: (f) => formatNumber(f.candidates) },
  {
    label: 'Profils proches retenus',
    value: (f) => f.closeProfilesRange,
    gap: (fs) => distinct(fs.map((f) => f.closeProfilesRange)),
    gapText: () => 'les profils proches retenus',
  },
  { label: 'Critères d’examen', value: (f) => f.criteriaSummary },
  {
    label: 'Alternance',
    value: (f) => f.alternanceLabel,
    gap: (fs) => distinct(fs.map((f) => f.alternance)),
    gapText: () => 'l’alternance',
  },
  {
    label: 'Part de pratique',
    value: (f) => `${f.practicePercent} %`,
    gap: (fs) => Math.max(...fs.map((f) => f.practicePercent)) - Math.min(...fs.map((f) => f.practicePercent)) >= 25,
    gapText: () => 'la façon d’apprendre (pratique ou théorique)',
  },
  { label: 'Façon d’apprendre', value: (f) => f.learningLabel },
  { label: 'Débouchés', value: (f) => f.outcomes },
  {
    label: 'Coût à prévoir',
    value: (f) => f.cost,
    gap: (fs) => distinct(fs.map((f) => f.cost)),
    gapText: () => 'le coût',
  },
  { label: 'Point de vigilance', value: (f) => f.vigilance },
  { label: 'Mise à jour', value: (f) => formatDate(f.updatedAt) },
]

const joinFr = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items.at(-1)}`)

export const ComparePage = () => {
  usePageTitle('Comparer')
  const user = useCurrentUser()
  const navigate = useNavigate()
  const location = useLocation()
  const compared = useRepo(() => comparisonRepo.getCompared(user.id), [user.id])
  const profile = useOwnProfile(user.id)
  const favorites = useFavoriteIds(user.id)
  const actions = useFormationActions(user.id)

  if (compared.loading || profile.loading) return <div className="container page"><LoadingState label="Chargement de votre comparaison…" /></div>
  if (compared.error || !compared.data || !profile.data) return <div className="container page"><ErrorState what="votre comparaison" error={compared.error ?? profile.error} /></div>

  const formations = compared.data
  const favoriteIds = favorites.data ?? []
  const gapRows = formations.length >= 2 ? ROWS.filter((r) => r.gap?.(formations)) : []
  const back = (
    <LinkButton to="/pistes" variant="ghost" icon={<ArrowLeft size={18} aria-hidden="true" />} style={{ paddingInline: 0 }}>
      Retour aux pistes
    </LinkButton>
  )

  if (!formations.length) {
    return (
      <div className="container page stack">
        {back}
        <div className="card">
          <EmptyState icon={<Columns2 size={20} />} title="Aucune formation à comparer" action={<LinkButton to="/pistes" arrow>Explorer les pistes</LinkButton>}>
            Cochez « Comparer » sur 2 ou 3 pistes pour les voir côte à côte.
          </EmptyState>
        </div>
      </div>
    )
  }

  return (
    <div className="container page stack">
      <div>{back}</div>
      <div>
        <h1 className="h1">
          Comparer {formations.length} formation{formations.length > 1 ? 's' : ''}
        </h1>
        <p className="lead">Les critères sont alignés ligne par ligne. Les lignes marquées « Écart » sont celles où les formations diffèrent le plus.</p>
      </div>
      {formations.length === 1 ? (
        <Alert tone="info" title="Une seule formation sélectionnée">
          Ajoutez au moins une autre formation pour voir les écarts.
        </Alert>
      ) : gapRows.length ? (
        <Alert tone="info" title="Ce qui change le plus">
          {(() => {
            const text = joinFr(gapRows.map((r) => r.gapText!(formations)).filter((t, i, all) => all.indexOf(t) === i))
            return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`
          })()}
        </Alert>
      ) : (
        <Alert tone="info" title="Ce qui change le plus">
          Ces formations sont très proches sur les critères comparés.
        </Alert>
      )}
      {formations.length >= 3 ? (
        <p className="small muted cluster" role="status">
          <Info size={16} aria-hidden="true" /> Vous comparez 3 formations, le maximum : retirez-en une pour en ajouter une autre.
        </p>
      ) : null}

      <div className="card compare-table-wrap" style={{ padding: 8 }}>
        <table className="compare-table">
          <caption className="visually-hidden">Comparaison des formations sélectionnées, critère par critère</caption>
          <thead>
            <tr>
              <th scope="col" className="overline muted">
                Critère
              </th>
              {formations.map((f) => (
                <th key={f.id} scope="col">
                  <span className="overline accent">{f.typeShort}</span>
                  <br />
                  <span className="h3">{f.title}</span>
                  <br />
                  <button type="button" className="link-button small" style={{ color: 'var(--color-muted)' }} onClick={() => void actions.toggleCompare(f)}>
                    <X size={14} aria-hidden="true" /> Retirer<span className="visually-hidden"> {f.title} de la comparaison</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Affinité</th>
              {formations.map((f) => (
                <td key={f.id} className="accent">
                  <AffinityDots dots={scoreFormation(f, profile.data!).dots} />
                </td>
              ))}
            </tr>
            {ROWS.map((row) => {
              const isGap = gapRows.includes(row)
              return (
                <tr key={row.label} className={isGap ? 'is-gap' : undefined}>
                  <th scope="row">
                    {row.label}
                    {isGap ? (
                      <span className="gap-label">
                        <span className="status-dot" aria-hidden="true" /> Écart
                      </span>
                    ) : null}
                  </th>
                  {formations.map((f) => (
                    <td key={f.id}>{row.value(f)}</td>
                  ))}
                </tr>
              )
            })}
            <tr>
              <td />
              {formations.map((f) => (
                <td key={f.id}>
                  <div className="stack-sm" style={{ alignItems: 'flex-start' }}>
                    <Button variant="secondary" onClick={() => navigate(`/formation/${f.id}`, { state: { background: location } })}>
                      Voir la fiche<span className="visually-hidden"> {f.title}</span>
                    </Button>
                    <FavoriteToggle active={actions.isFavorite(f.id, favoriteIds)} onToggle={() => void actions.toggleFavorite(f, actions.isFavorite(f.id, favoriteIds))} />
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        <p className="small muted cluster" style={{ padding: 12, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
          <Info size={16} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
          Places, candidats et profils proches retenus sont des repères des années passées (fictifs), à lire avec une marge d’erreur. Ce ne sont pas des décisions
          d’admission.
        </p>
      </div>
      <div className="cluster">
        <LinkButton to="/favoris" arrow>
          Préparer l’échange avec mon conseiller
        </LinkButton>
        {formations.length < 3 ? (
          <LinkButton to="/pistes" variant="secondary">
            Ajouter une formation
          </LinkButton>
        ) : (
          <Button variant="secondary" disabled aria-describedby="compare-max">
            Ajouter une formation
          </Button>
        )}
        {formations.length >= 3 ? (
          <span id="compare-max" className="visually-hidden">
            Maximum de 3 formations atteint
          </span>
        ) : null}
      </div>
    </div>
  )
}
