import { Building2, Check, ChevronRight, Clock, GraduationCap, Lightbulb, Lock, Users, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '../../auth/AuthContext'
import { AffinityDots, CriteriaBar, IconChip, LinkButton, Status, Tag } from '../../components'
import { usePageTitle } from '../../hooks/usePageTitle'
import { usePistes } from '../../hooks/useStudent'
import { SwitchSpaceModal } from '../../layouts/AccountModals'
import type { Role } from '../../types'
import { cityText, selectivityShort } from './FormationParts'

export const HomePage = () => {
  usePageTitle('Accueil')
  const user = useCurrentUser()
  const { ranked, profile } = usePistes(user.id)
  const [space, setSpace] = useState<Role | null>(null)
  const answered = Boolean(profile && Object.keys(profile.interests).length)
  const top = answered ? ranked?.[0] : undefined

  return (
    <div className="container page stack-lg">
      <section className="hero-grid">
        <div className="stack-lg">
          <span className="desktop-only">
            <Status tone="info">Plateforme indépendante et gratuite</Status>
          </span>
          <span className="mobile-only">
            <Status tone="info">Indépendante et gratuite</Status>
          </span>
          <h1 className="display">Trouvez des formations qui vous ressemblent, et comprenez pourquoi.</h1>
          <p className="muted">
            Répondez à quelques questions, découvrez des pistes expliquées critère par critère, comparez-les, puis préparez votre choix avec votre conseiller. Orient’Avenir ne
            décide rien à votre place.
          </p>
          <div className="cluster-lg">
            <LinkButton to="/profil/interets" arrow>
              <span className="desktop-only">{answered ? 'Reprendre le questionnaire' : 'Commencer le questionnaire'}</span>
              <span className="mobile-only">Découvrir mes pistes</span>
            </LinkButton>
            <LinkButton to="/decouverte" variant="secondary" className="desktop-only">
              Explorer sans questionnaire
            </LinkButton>
          </div>
          <ul className="list-reset cluster-lg small strong">
            <li className="cluster" style={{ gap: 6 }}>
              <Clock size={18} aria-hidden="true" className="accent" /> 5 minutes environ
            </li>
            <li className="cluster" style={{ gap: 6 }}>
              <Lock size={18} aria-hidden="true" className="accent" /> Aucune donnée personnelle
            </li>
            <li className="cluster" style={{ gap: 6 }}>
              <Lightbulb size={18} aria-hidden="true" className="accent" /> Chaque piste est expliquée
            </li>
          </ul>
        </div>
        <aside className="card card-lg hero-preview stack desktop-only" aria-label="Aperçu d’une piste">
          <p className="overline muted">{top ? 'Votre première piste' : 'Aperçu d’une piste'}</p>
          {top ? (
            <>
              <div className="spread">
                <h2 className="h2">{top.formation.title}</h2>
                <Status>{selectivityShort[top.formation.selectivity]}</Status>
              </div>
              <p className="small muted">
                {top.formation.institution.name} · {cityText[top.formation.institution.citySize]} · {top.formation.durationLabel}
              </p>
              <p className="small cluster">
                Affinité avec vos réponses <AffinityDots dots={top.score.dots} />
              </p>
              <div className="surface-2 stack-sm">
                <h3 className="h3" style={{ fontSize: 15 }}>
                  Pourquoi cette piste ?
                </h3>
                <CriteriaBar label="Vos intérêts" value={top.score.shares.interests} />
                <CriteriaBar label="Vos spécialités" value={top.score.shares.specialites} />
                <CriteriaBar label="Vos préférences" value={top.score.shares.preferences} />
              </div>
            </>
          ) : (
            <>
              <div className="spread">
                <h2 className="h2">BUT Informatique</h2>
                <Status>Sélective</Status>
              </div>
              <p className="small muted">IUT de Valmont · ville moyenne · 3 ans</p>
              <p className="small cluster">
                Affinité avec vos réponses <AffinityDots dots={4} />
              </p>
              <div className="surface-2 stack-sm">
                <h3 className="h3" style={{ fontSize: 15 }}>
                  Pourquoi cette piste ?
                </h3>
                <CriteriaBar label="Vos intérêts" value={58} />
                <CriteriaBar label="Vos spécialités" value={25} />
                <CriteriaBar label="Vos préférences" value={17} />
              </div>
              <p className="small muted">Exemple : répondez au questionnaire pour voir vos propres pistes.</p>
            </>
          )}
          <p className="small muted">Les pourcentages montrent le poids de chaque critère, jamais une chance d’admission.</p>
        </aside>
      </section>

      <section className="stack" aria-labelledby="spaces-title">
        <div>
          <h2 id="spaces-title" className="h1">
            <span className="desktop-only">Trois espaces, un même dossier</span>
            <span className="mobile-only">Votre espace</span>
          </h2>
          <p className="lead desktop-only">L’élève garde la main : c’est lui qui choisit ce qu’il partage avec son conseiller.</p>
        </div>
        <div className="grid-3">
          <article className="card card-lg stack">
            <IconChip>
              <GraduationCap size={20} />
            </IconChip>
            <h3 className="h2">Je suis au lycée</h3>
            <p className="small muted">Questionnaire, pistes expliquées, comparaison et favoris. Vous partagez votre dossier seulement si vous le souhaitez.</p>
            <Link className="link-button" to="/profil/interets">
              Commencer <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </article>
          <article className="card card-lg stack">
            <IconChip>
              <Users size={20} />
            </IconChip>
            <h3 className="h2">J’accompagne des élèves</h3>
            <p className="small muted">Dossiers partagés, points à discuter et questions pour préparer chaque entretien.</p>
            <button type="button" className="link-button" onClick={() => setSpace('conseiller')}>
              Ouvrir le suivi <ChevronRight size={16} aria-hidden="true" />
            </button>
          </article>
          <article className="card card-lg stack">
            <IconChip>
              <Building2 size={20} />
            </IconChip>
            <h3 className="h2">Je représente un établissement</h3>
            <p className="small muted">Fiches formation fiables et à jour, chiffres d’intérêt anonymisés et agrégés.</p>
            <button type="button" className="link-button" onClick={() => setSpace('etablissement')}>
              Gérer mes fiches <ChevronRight size={16} aria-hidden="true" />
            </button>
          </article>
        </div>
      </section>

      <section className="grid-2">
        <article className="card card-lg stack">
          <h2 className="h2">Ce que fait Orient’Avenir</h2>
          <ul className="check-list">
            {['Propose des pistes à partir de vos réponses', 'Explique chaque piste, critère par critère', 'Ouvre aussi des pistes hors de vos habitudes', 'Partage votre dossier seulement avec votre accord'].map((t) => (
              <li key={t}>
                <span className="check-icon" aria-hidden="true">
                  <Check size={14} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </article>
        <article className="card card-lg stack">
          <h2 className="h2">Ce qu’il ne fait pas</h2>
          <ul className="check-list">
            {['Il ne décide d’aucune admission', 'Il ne remplace pas la plateforme officielle de candidature', 'Il ne classe pas les élèves entre eux', 'Il ne revend aucune donnée'].map((t) => (
              <li key={t}>
                <span className="check-icon check-icon-bad" aria-hidden="true">
                  <X size={14} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </article>
      </section>
      <footer className="small muted">
        <span className="desktop-only">Prototype pédagogique · Design des usages 2027 · données fictives, interactions simulées</span>
        <span className="mobile-only">Prototype pédagogique · données fictives</span>
        <span className="visually-hidden"> </span>
      </footer>
      {user.isGuest ? (
        <p className="small muted">
          <Tag>Mode invité</Tag> Vos réponses restent sur cet appareil.
        </p>
      ) : null}
      {space ? <SwitchSpaceModal role={space} onClose={() => setSpace(null)} /> : null}
    </div>
  )
}
