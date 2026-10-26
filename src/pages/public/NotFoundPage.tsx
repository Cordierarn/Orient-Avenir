import { ArrowRight, BarChart3, Building2, CalendarDays, Columns2, Compass, FileText, Info, MessageCircle, Search, SlidersHorizontal, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { homeFor } from '../../auth/routing'
import { IconChip, LinkButton } from '../../components'
import { usePageTitle } from '../../hooks/usePageTitle'
import { Header } from '../../layouts/Header'

const shortcutsFor = (role: string | undefined) => {
  if (role === 'conseiller')
    return [
      { to: '/conseiller/demandes', title: 'Demandes', text: 'Voir les demandes de rendez-vous', icon: MessageCircle },
      { to: '/conseiller/eleves', title: 'Mes élèves', text: 'Retrouver les dossiers partagés', icon: Users },
      { to: '/conseiller/decouverte', title: 'Découverte', text: 'Consulter les formations publiées', icon: Compass },
      { to: '/conseiller/profil', title: 'Mon profil', text: 'Modifier mes domaines et disponibilités', icon: SlidersHorizontal },
    ]
  if (role === 'etablissement')
    return [
      { to: '/etablissement/fiches', title: 'Mes fiches', text: 'Mettre à jour mes formations', icon: FileText },
      { to: '/etablissement/chiffres', title: 'Chiffres d’intérêt', text: 'Voir les chiffres agrégés', icon: BarChart3 },
      { to: '/etablissement/page', title: 'Page de l’école', text: 'Voir la page telle que les lycéens la voient', icon: Building2 },
      { to: '/etablissement/profils', title: 'Profils intéressés', text: 'Préparer les portes ouvertes', icon: Users },
    ]
  return [
    { to: '/profil/interets', title: 'Mon profil', text: 'Modifier mes réponses au questionnaire', icon: SlidersHorizontal },
    { to: '/comparer', title: 'Comparer', text: 'Reprendre ma comparaison en cours', icon: Columns2 },
    { to: '/echeances', title: 'Échéances', text: 'Voir les prochaines dates à ne pas rater', icon: CalendarDays },
    { to: '/rendez-vous', title: 'Rendez-vous', text: 'Échanger avec un conseiller', icon: MessageCircle },
  ]
}

export const NotFoundPage = () => {
  usePageTitle('Page introuvable')
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const home = user ? homeFor(user) : '/connexion'
  const discovery = user?.role === 'conseiller' ? '/conseiller/decouverte' : user?.role === 'etablissement' ? '/etablissement/decouverte' : '/decouverte'
  const second =
    user?.role === 'conseiller'
      ? { to: '/conseiller/demandes', label: 'Voir mes demandes' }
      : user?.role === 'etablissement'
        ? { to: '/etablissement/fiches', label: 'Voir mes fiches' }
        : { to: '/pistes', label: 'Voir mes pistes' }

  const search = (event: FormEvent) => {
    event.preventDefault()
    const target = `${discovery}?q=${encodeURIComponent(query.trim())}`
    if (user) navigate(target)
    else navigate('/connexion', { state: { from: target } })
  }

  return (
    <>
      <Header showTabs={false} />
      <main id="contenu" className="container page stack-lg">
        <section className="card card-lg notfound-hero">
          <span className="notfound-icon" aria-hidden="true">
            <Compass size={40} />
          </span>
          <p className="overline accent">Erreur 404</p>
          <h1 className="display" style={{ fontSize: 'clamp(28px, 5vw, 40px)', lineHeight: 1.2 }}>
            Cette page s’est perdue en chemin
          </h1>
          <p className="muted" style={{ maxWidth: 520 }}>
            Le lien est peut-être ancien, mal recopié, ou la formation a été retirée par son établissement. Vos réponses, vos favoris et vos rendez-vous sont toujours là.
          </p>
          <div className="cluster" style={{ justifyContent: 'center' }}>
            <LinkButton to={home} arrow>
              Retour à l’accueil
            </LinkButton>
            <LinkButton to={user ? second.to : '/connexion'} variant="secondary" state={user ? undefined : { from: second.to }}>
              {second.label}
            </LinkButton>
          </div>
          <form role="search" onSubmit={search} style={{ width: 'min(100%, 420px)' }}>
            <label htmlFor="notfound-search" className="visually-hidden">
              Rechercher une formation, un établissement
            </label>
            <div className="input-icon">
              <Search size={18} aria-hidden="true" />
              <input
                id="notfound-search"
                className="input"
                type="search"
                placeholder="Rechercher une formation, un établissement…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </form>
        </section>
        <section className="stack" aria-labelledby="useful-pages">
          <h2 id="useful-pages" className="h2">
            Pages utiles
          </h2>
          <div className="grid-4">
            {shortcutsFor(user?.role).map(({ to, title, text, icon: Icon }) => (
              <Link key={to} to={user ? to : '/connexion'} state={user ? undefined : { from: to }} className="card shortcut-card">
                <IconChip>
                  <Icon size={20} />
                </IconChip>
                <span className="h3">{title}</span>
                <span className="small muted">{text}</span>
                <span className="link-button small" aria-hidden="true">
                  Ouvrir <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
          <p className="small muted cluster">
            <Info size={16} aria-hidden="true" /> Le problème persiste ? Notez l’adresse de la page et signalez-la à l’équipe du projet.
          </p>
        </section>
      </main>
    </>
  )
}
