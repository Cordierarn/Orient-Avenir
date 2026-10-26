import { ErrorState, LoadingState, Status } from '../../components'
import { formationRepo } from '../../db/repositories'
import { useRepo } from '../../hooks/useRepo'

const trendTone = { 'En hausse': 'info', Stable: 'neutral', 'En baisse': 'warning', Masqué: 'neutral' } as const

/** Chiffres agrégés et anonymes : toute valeur inférieure à 10 est affichée « Moins de 10 ». */
export const InterestStatsTable = ({ userId, headingLevel = 2 }: { userId: string; headingLevel?: 1 | 2 }) => {
  const stats = useRepo(() => formationRepo.getInterestStats(userId), [userId])
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  const max = Math.max(1, ...(stats.data ?? []).flatMap((s) => [s.favorites ?? 0, s.comparisons ?? 0]))
  return (
    <section className="card card-lg stack-sm" aria-labelledby="stats-title">
      <Heading id="stats-title" className={headingLevel === 1 ? 'h1' : 'h2'}>
        Chiffres d’intérêt, agrégés et anonymes
      </Heading>
      <p className="small muted">Aucune donnée individuelle. En dessous de 10 lycéens, le chiffre est masqué pour éviter toute identification.</p>
      {stats.loading ? <LoadingState /> : null}
      {stats.error ? <ErrorState what="les chiffres d’intérêt" error={stats.error} /> : null}
      {stats.data ? (
        <div className="compare-table-wrap">
          <table className="data-table" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                <th scope="col">Formation</th>
                <th scope="col">Ajouts en favoris</th>
                <th scope="col">Comparaisons</th>
                <th scope="col">Tendance sur 30 jours</th>
              </tr>
            </thead>
            <tbody>
              {stats.data.map((s) => (
                <tr key={s.formationId}>
                  <th scope="row" className="strong" style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--color-ink)', fontSize: 14 }}>
                    {s.title}
                    {s.status === 'brouillon' ? <span className="small muted"> (brouillon)</span> : null}
                  </th>
                  <td>
                    <span className={s.favorites === null ? 'muted' : 'strong'}>{s.favoritesLabel}</span>
                    {s.favorites !== null ? (
                      <span className="bar-inline" aria-hidden="true">
                        <span style={{ width: `${(s.favorites / max) * 100}%` }} />
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <span className={s.comparisons === null ? 'muted' : 'strong'}>{s.comparisonsLabel}</span>
                    {s.comparisons !== null ? (
                      <span className="bar-inline" aria-hidden="true">
                        <span style={{ width: `${(s.comparisons / max) * 100}%` }} />
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <Status tone={trendTone[s.trend]}>{s.trend}</Status>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
