import { ArrowRight, Building2, CalendarClock, Check, CheckCircle2, Compass, Filter, GraduationCap, Info, LockKeyhole, Send, TriangleAlert, Users, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Alert, Button, Checkbox, CriteriaBar, EthicsBanner, FavoriteToggle, Field, LevelSlider, Modal, Radio, RoleSwitcher, Status, Tag } from './components/ui'
import { useApp } from './context/AppContext'
import { appointmentSlots } from './data/appointments'
import { officialDeadlines } from './data/calendar'
import { domains, levelLabels } from './data/domains'
import { personas } from './data/personas'
import { programs, specialties } from './data/programs'
import { getRecommendations, scoreProgram } from './lib/scoring'
import './index.css'

const roleTabs = {
  lyceen: [
    { to: '/profil/interets', label: 'Mon profil' },
    { to: '/pistes', label: 'Pistes suggérées' },
    { to: '/comparer', label: 'Comparer' },
    { to: '/favoris', label: 'Favoris (2)' },
    { to: '/rendez-vous', label: 'Rendez-vous' },
    { to: '/echeances', label: 'Échéances (2)' },
    { to: '/echange', label: 'Découverte' },
  ],
  conseiller: [
    { to: '/conseiller/demandes', label: 'Demandes' },
    { to: '/conseiller/eleves', label: 'Élèves' },
    { to: '/pistes', label: 'Découverte' },
  ],
  etablissement: [
    { to: '/etablissement/fiches', label: 'Fiches' },
    { to: '/etablissement/chiffres', label: 'Chiffres' },
    { to: '/etablissement/page', label: 'Page' },
    { to: '/etablissement/profils', label: 'Profils' },
    { to: '/pistes', label: 'Découverte' },
  ],
}

const layoutLinks = {
  lyceen: '/profil/interets',
  conseiller: '/conseiller/demandes',
  etablissement: '/etablissement/fiches',
}

const ProgramCard = ({ id }: { id: string }) => {
  const { state, updateState, setLiveMessage } = useApp()
  const navigate = useNavigate()
  const program = programs.find((entry) => entry.id === id)
  if (!program) return null
  const recommendation = scoreProgram(program, state.student)
  const favorite = state.favorites[id] !== undefined
  return (
    <article className="card">
      <div className="space-between">
        <div>
          <h3>{program.nom}</h3>
          <p>
            {program.etablissement} • {program.ville}
          </p>
        </div>
        <Status tone="info" text={`Affinité ${'●'.repeat(recommendation.affinityDots)}${'○'.repeat(5 - recommendation.affinityDots)} / 5`} />
      </div>
      <p>{program.description}</p>
      <div className="row-wrap">
        <Tag>{program.type}</Tag>
        <Tag>{program.selectivite}</Tag>
        <Tag>{program.partPratique} % pratique</Tag>
      </div>
      <section>
        <h4>Pourquoi cette piste ?</h4>
        <CriteriaBar label="Intérêts" value={recommendation.criteriaWeights.interests} />
        <CriteriaBar label="Spécialités" value={recommendation.criteriaWeights.specialites} />
        <CriteriaBar label="Préférences" value={recommendation.criteriaWeights.preferences} />
        <p>{recommendation.explanation}</p>
      </section>
      <Alert tone="warning">Estimation sur données fictives, ni une promesse, ni un refus.</Alert>
      <p>
        Repères des années passées : {program.repere.places} places, {program.repere.candidats} candidats, profils proches avec proposition : {program.repere.propositionRange}.
      </p>
      <p>
        <strong>Point de vigilance :</strong> {program.vigilance}
      </p>
      <div className="row-wrap">
        <FavoriteToggle
          active={favorite}
          onToggle={() => {
            updateState((current) => {
              const nextFavorites = { ...current.favorites }
              if (nextFavorites[id] !== undefined) {
                delete nextFavorites[id]
              } else {
                nextFavorites[id] = ''
              }
              return { ...current, favorites: nextFavorites }
            })
            setLiveMessage(favorite ? 'Retiré des favoris' : 'Ajouté aux favoris')
          }}
        />
        <Checkbox
          label={state.compareIds.includes(id) ? 'Retirer de comparer' : 'Ajouter à comparer'}
          checked={state.compareIds.includes(id)}
          onChange={() => {
            if (!state.compareIds.includes(id) && state.compareIds.length >= 3) {
              setLiveMessage('Maximum 3 formations pour la comparaison.')
              return
            }
            updateState((current) => ({
              ...current,
              compareIds: current.compareIds.includes(id) ? current.compareIds.filter((entry) => entry !== id) : [...current.compareIds, id],
            }))
          }}
        />
        <Button variant="secondary" onClick={() => navigate(`/formation/${id}`)}>
          Voir la fiche
        </Button>
      </div>
    </article>
  )
}

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { state, setRole, resetDemo } = useApp()
  const location = useLocation()
  return (
    <>
      <header className="topbar">
        <Link to="/" className="logo">
          <span className="logo-mark"><Compass /></span>
          <span><strong>Orient&apos;Avenir</strong><small>Explorer, comprendre, comparer</small></span>
        </Link>
        <RoleSwitcher role={state.role} onChange={setRole} />
        <Button variant="ghost" onClick={resetDemo}>
          Réinitialiser la démo
        </Button>
      </header>
      <EthicsBanner />
      {location.pathname !== '/' ? <nav className="role-nav" aria-label="Navigation par rôle">
        {roleTabs[state.role].map((tab) => (
          <NavLink key={tab.to} to={tab.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            {tab.label}
          </NavLink>
        ))}
      </nav> : null}
      <main>{children}</main>
      <p className="sr-only" role="status" aria-live="polite">
        {state.liveMessage}
      </p>
    </>
  )
}

const HomePage = () => (
  <section className="home-page">
    <div className="home-hero">
      <div className="home-copy">
        <span className="eyebrow"><span className="eyebrow-dot" /> Plateforme indépendante et gratuite</span>
        <h1>Trouvez des formations qui vous ressemblent, et comprenez pourquoi.</h1>
        <p>Répondez à quelques questions, découvrez des pistes expliquées critère par critère, comparez-les, puis préparez votre choix avec votre conseiller. Orient’Avenir ne décide rien à votre place.</p>
        <div className="row-wrap home-actions">
          <Link to="/profil/interets" className="btn btn-primary">Commencer le questionnaire <ArrowRight size={18} /></Link>
          <Link to="/pistes" className="btn btn-secondary">Explorer sans questionnaire</Link>
        </div>
        <div className="home-promises">
          <span><Clock3Icon /> 5 minutes environ</span>
          <span><LockKeyhole size={19} /> Aucune donnée personnelle</span>
          <span><Info size={19} /> Chaque piste est expliquée</span>
        </div>
      </div>
      <article className="preview-card">
        <span className="preview-kicker">APERÇU D’UNE PISTE</span>
        <div className="space-between preview-title"><h2>BUT Informatique</h2><Status tone="neutral" text="Sélective" /></div>
        <p>IUT de Valmont · ville moyenne · 3 ans</p>
        <p className="affinity">Affinité avec vos réponses <strong>●●●●○</strong> <span>4 sur 5</span></p>
        <div className="preview-criteria">
          <h3>Pourquoi cette piste ?</h3>
          <CriteriaBar label="Vos intérêts" value={58} />
          <CriteriaBar label="Vos spécialités" value={25} />
          <CriteriaBar label="Vos préférences" value={17} />
        </div>
        <p className="preview-note">Les pourcentages montrent le poids de chaque critère, jamais une chance d’admission.</p>
      </article>
    </div>

    <section className="home-section">
      <h2>Trois espaces, un même dossier</h2>
      <p>L’élève garde la main : c’est lui qui choisit ce qu’il partage avec son conseiller.</p>
      <div className="grid cards-3 home-role-cards">
        <article className="card home-role-card"><span className="icon-tile"><GraduationCap /></span><h3>Je suis au lycée</h3><p>Questionnaire, pistes expliquées, comparaison et favoris. Vous partagez votre dossier seulement si vous le souhaitez.</p><Link to="/profil/interets">Commencer <ArrowRight size={18} /></Link></article>
        <article className="card home-role-card"><span className="icon-tile"><Users /></span><h3>J’accompagne des élèves</h3><p>Dossiers partagés, points à discuter et questions pour préparer chaque entretien.</p><Link to="/conseiller/demandes">Ouvrir le suivi <ArrowRight size={18} /></Link></article>
        <article className="card home-role-card"><span className="icon-tile"><Building2 /></span><h3>Je représente un établissement</h3><p>Fiches formation fiables et à jour, chiffres d’intérêt anonymisés et agrégés.</p><Link to="/etablissement/fiches">Gérer mes fiches <ArrowRight size={18} /></Link></article>
      </div>
    </section>

    <div className="grid cards-2 home-trust-grid">
      <article className="card trust-card"><h3>Ce que fait Orient’Avenir</h3><p><Check /> Propose des pistes à partir de vos réponses</p><p><Check /> Explique chaque piste, critère par critère</p><p><Check /> Ouvre aussi des pistes hors de vos habitudes</p><p><Check /> Partage votre dossier seulement avec votre accord</p></article>
      <article className="card trust-card"><h3>Ce qu’il ne fait pas</h3><p><X /> Il ne décide d’aucune admission</p><p><X /> Il ne remplace pas la plateforme officielle de candidature</p><p><X /> Il ne classe pas les élèves entre eux</p><p><X /> Il ne revend aucune donnée</p></article>
    </div>
    <p className="home-footer">Prototype pédagogique · Design des usages 2027 · données fictives, interactions simulées</p>
  </section>
)

const Clock3Icon = () => <span className="inline-icon"><CalendarClock size={19} /></span>

const InteretsPage = () => {
  const { state, updateState } = useApp()
  return (
    <section className="section">
      <h2>Étape 1/4 — Vos intérêts</h2>
      <Alert>
        <Info size={16} /> Pourquoi ces questions ? Mieux comprendre ce qui vous motive au quotidien.
      </Alert>
      <div className="grid programs-grid">
        {domains.map((domain) => (
          <LevelSlider
            key={domain.id}
            label={`${domain.label} — ${levelLabels[state.student.interests[domain.id]]}`}
            value={state.student.interests[domain.id]}
            onChange={(value) =>
              updateState((current) => ({
                ...current,
                student: {
                  ...current.student,
                  interests: { ...current.student.interests, [domain.id]: value },
                },
              }))
            }
          />
        ))}
      </div>
      <Link to="/profil/preferences" className="btn btn-primary">
        Continuer
      </Link>
    </section>
  )
}

const PreferencesPage = () => {
  const { state, updateState } = useApp()
  return (
    <section className="section">
      <h2>Étape 2/4 — Préférences</h2>
      <Field label="Spécialités">
        <div className="checkbox-grid">
          {specialties.map((specialty) => (
            <Checkbox
              key={specialty}
              label={specialty}
              checked={state.student.specialites.includes(specialty)}
              onChange={() =>
                updateState((current) => ({
                  ...current,
                  student: {
                    ...current.student,
                    specialites: current.student.specialites.includes(specialty)
                      ? current.student.specialites.filter((entry) => entry !== specialty)
                      : [...current.student.specialites, specialty],
                  },
                }))
              }
            />
          ))}
        </div>
      </Field>
      <Field label="Taille de ville préférée">
        <Radio
          name="city"
          value={state.student.cityPreference}
          onChange={(value) => updateState((current) => ({ ...current, student: { ...current.student, cityPreference: value as 'indifferent' | 'grande' | 'moyenne' | 'petite' } }))}
          options={[
            { label: 'Indifférent', value: 'indifferent' },
            { label: 'Grande', value: 'grande' },
            { label: 'Moyenne', value: 'moyenne' },
            { label: 'Petite', value: 'petite' },
          ]}
        />
      </Field>
      <Field label="Durée souhaitée">
        <Radio
          name="duree"
          value={state.student.durationPreference}
          onChange={(value) => updateState((current) => ({ ...current, student: { ...current.student, durationPreference: value as 'indifferent' | 'court' | 'moyen' | 'long' } }))}
          options={[
            { label: 'Indifférent', value: 'indifferent' },
            { label: '2 ans', value: 'court' },
            { label: '3 ans', value: 'moyen' },
            { label: '5 ans et +', value: 'long' },
          ]}
        />
      </Field>
      <Field label="Façon d’apprendre">
        <Radio
          name="apprendre"
          value={state.student.learningStyle}
          onChange={(value) => updateState((current) => ({ ...current, student: { ...current.student, learningStyle: value as 'theorique' | 'equilibre' | 'pratique' } }))}
          options={[
            { label: 'Plutôt théorique', value: 'theorique' },
            { label: 'Équilibré', value: 'equilibre' },
            { label: 'Très pratique', value: 'pratique' },
          ]}
        />
      </Field>
      <Field label="Alternance">
        <Radio
          name="alternance"
          value={state.student.alternancePreference}
          onChange={(value) => updateState((current) => ({ ...current, student: { ...current.student, alternancePreference: value as 'oui' | 'non' | 'indifferent' } }))}
          options={[
            { label: 'Indifférent', value: 'indifferent' },
            { label: 'Oui', value: 'oui' },
            { label: 'Non', value: 'non' },
          ]}
        />
      </Field>
      <Link to="/profil/dossier" className="btn btn-primary">
        Continuer
      </Link>
    </section>
  )
}

const DossierPage = () => {
  const { state, updateState } = useApp()
  const setGrade = (key: string, value: string) =>
    updateState((current) => ({
      ...current,
      student: {
        ...current.student,
        moyennes: { ...current.student.moyennes, [key]: Number(value) || 0 },
      },
    }))

  return (
    <section className="section">
      <h2>Étape 3/4 — Dossier (facultatif)</h2>
      <Alert tone="info">Ces moyennes restent uniquement sur votre appareil et ne sont jamais visibles sans consentement.</Alert>
      <div className="grid cards-2">
        {['Maths', 'Français', 'Langues', 'Sciences'].map((subject) => (
          <Field key={subject} label={`Moyenne ${subject}`}>
            <input type="number" min={0} max={20} value={state.student.moyennes[subject] ?? ''} onChange={(event) => setGrade(subject, event.target.value)} />
          </Field>
        ))}
      </div>
      <Checkbox
        label="Utiliser ces moyennes pour afficher des repères personnalisés"
        checked={state.student.useGradesForRepere}
        onChange={(event) =>
          updateState((current) => ({
            ...current,
            student: { ...current.student, useGradesForRepere: event.target.checked },
          }))
        }
      />
      <div className="row-wrap">
        <Link to="/pistes" className="btn btn-primary">
          Voir mes pistes
        </Link>
        <Link to="/pistes" className="btn btn-ghost">
          Passer cette étape
        </Link>
      </div>
      <Alert tone="success">
        <CheckCircle2 size={16} /> Votre profil fictif est enregistré automatiquement sur cet appareil.
      </Alert>
    </section>
  )
}

const PistesPage = () => {
  const { state } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const recommendations = getRecommendations(programs, state.student)
  const compareMessage = state.compareIds.length > 1 ? `${state.compareIds.length} formations sélectionnées → Comparer` : 'Choisissez 2 à 3 formations à comparer'
  const search = searchParams.get('q') ?? ''
  const visible = recommendations.filter((entry) => {
    const program = programs.find((item) => item.id === entry.programId)
    return program?.nom.toLowerCase().includes(search.toLowerCase()) ?? false
  })

  return (
    <section className="section">
      <div className="space-between">
        <h2>Vos pistes</h2>
        <label className="search-field">
          <Filter size={16} />
          <input
            defaultValue={search}
            placeholder="Rechercher une formation"
            onBlur={(event) => setSearchParams(event.target.value.trim() ? { q: event.target.value.trim() } : {})}
          />
        </label>
      </div>
      <Alert tone="info">L’affinité est un repère d’exploration, jamais une chance d’admission.</Alert>
      <div className="card">
        <h3>Comment lire ces pistes ?</h3>
        <p>Chaque carte explique les critères et affiche des repères séparés des décisions d’admission.</p>
      </div>
      <div className="grid">
        {visible.map((entry) => (
          <div key={entry.programId}>
            {entry.openingTrack ? <Status tone="warning" text="Piste d’ouverture" /> : null}
            <ProgramCard id={entry.programId} />
          </div>
        ))}
      </div>
      <div className="floating-compare">{compareMessage}</div>
    </section>
  )
}

const FormationModalPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state, updateState } = useApp()
  const program = programs.find((entry) => entry.id === id)
  if (!program) return <Navigate to="/pistes" replace />
  const favorite = state.favorites[program.id] !== undefined

  return (
    <section className="section">
      <Modal open title={program.nom} onClose={() => navigate('/pistes')}>
        <p>
          <strong>En bref :</strong> {program.description}
        </p>
        <p>
          <strong>Débouchés :</strong> {program.debouches.join(', ')}
        </p>
        <p>
          <strong>Point de vigilance :</strong> {program.vigilance}
        </p>
        <h3>Pourquoi pour vous</h3>
        <p>{scoreProgram(program, state.student).explanation}</p>
        <h3>Critères d’examen déclarés</h3>
        {program.criteresExamen.map((item) => (
          <CriteriaBar key={item.critere} label={item.critere} value={item.poids} />
        ))}
        <h3>Repères des années passées</h3>
        <Alert tone="warning">Estimation sur données fictives, ni une promesse, ni un refus.</Alert>
        <p>
          Places: {program.repere.places} • Candidats: {program.repere.candidats} • Profils proches: {program.repere.propositionRange}
        </p>
        <p>
          <strong>Portes ouvertes :</strong> {program.portesOuvertes}
        </p>
        <div className="row-wrap">
          <FavoriteToggle
            active={favorite}
            onToggle={() =>
              updateState((current) => ({
                ...current,
                favorites: favorite
                  ? Object.fromEntries(Object.entries(current.favorites).filter(([key]) => key !== program.id))
                  : { ...current.favorites, [program.id]: '' },
              }))
            }
          />
          <Button
            onClick={() =>
              updateState((current) => ({
                ...current,
                selectedOpenDays: current.selectedOpenDays.includes(program.portesOuvertes)
                  ? current.selectedOpenDays
                  : [...current.selectedOpenDays, program.portesOuvertes],
              }))
            }
          >
            Ajouter aux échéances
          </Button>
        </div>
      </Modal>
    </section>
  )
}

const ComparePage = () => {
  const { state, updateState } = useApp()
  const compared = state.compareIds.map((id) => programs.find((entry) => entry.id === id)).filter((entry): entry is (typeof programs)[number] => Boolean(entry))

  if (compared.length < 2) {
    return (
      <section className="section">
        <h2>Comparer</h2>
        <Alert tone="warning">Sélectionnez au moins 2 formations depuis les pistes.</Alert>
      </section>
    )
  }

  const rows = [
    { label: 'Durée', values: compared.map((program) => `${program.dureeAnnees} ans`) },
    { label: 'Sélectivité', values: compared.map((program) => program.selectivite) },
    { label: 'Alternance', values: compared.map((program) => (program.alternance ? 'Oui' : 'Non')) },
    { label: 'Pratique', values: compared.map((program) => `${program.partPratique}%`) },
  ]

  return (
    <section className="section">
      <h2>Comparer les formations</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Critère</th>
              {compared.map((program) => (
                <th key={program.id}>{program.nom}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const spread = new Set(row.values).size > 1
              return (
                <tr key={row.label} className={spread ? 'diff' : ''}>
                  <td>{row.label}</td>
                  {row.values.map((value) => (
                    <td key={`${row.label}-${value}`}>{value}</td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Alert tone="info">Ce qui change le plus : sélectivité, part de pratique et alternance.</Alert>
      <div className="row-wrap">
        {compared.map((program) => (
          <Button key={program.id} variant="ghost" onClick={() => updateState((current) => ({ ...current, compareIds: current.compareIds.filter((id) => id !== program.id) }))}>
            Retirer {program.nom}
          </Button>
        ))}
      </div>
    </section>
  )
}

const FavorisPage = () => {
  const { state, updateState } = useApp()
  const favoritePrograms = Object.keys(state.favorites)
    .map((id) => programs.find((entry) => entry.id === id))
    .filter((entry): entry is (typeof programs)[number] => Boolean(entry))

  return (
    <section className="section">
      <h2>Favoris et partage</h2>
      {favoritePrograms.length === 0 ? <Alert tone="warning">Aucun favori pour le moment.</Alert> : null}
      {favoritePrograms.map((program) => (
        <article key={program.id} className="card">
          <h3>{program.nom}</h3>
          <Field label="Note personnelle">
            <textarea
              value={state.favorites[program.id]}
              onChange={(event) =>
                updateState((current) => ({
                  ...current,
                  favorites: { ...current.favorites, [program.id]: event.target.value },
                }))
              }
            />
          </Field>
        </article>
      ))}
      <div className="card">
        <h3>Partage du dossier</h3>
        <p>Partagé au conseiller : intérêts, préférences, favoris et notes.</p>
        <p>Jamais partagé : moyennes, coordonnées privées.</p>
        <Checkbox
          label="Je consens à partager mon dossier avec mon conseiller"
          checked={state.shareWithCounselor}
          onChange={(event) => updateState((current) => ({ ...current, shareWithCounselor: event.target.checked }))}
        />
        <Checkbox
          label="Je rends mon profil visible aux écoles (révocable)"
          checked={state.visibleToSchools}
          onChange={(event) => updateState((current) => ({ ...current, visibleToSchools: event.target.checked }))}
        />
      </div>
    </section>
  )
}

const RendezVousPage = () => {
  const { state, updateState, setLiveMessage } = useApp()
  const advisors = personas.counselors
  return (
    <section className="section">
      <h2>Prendre rendez-vous</h2>
      <div className="grid cards-2">
        <div className="card">
          <h3>Conseillers proposés</h3>
          {advisors.map((advisor) => (
            <p key={advisor.nom}>
              <strong>{advisor.nom}</strong> — {advisor.specialite}
            </p>
          ))}
        </div>
        <div className="card">
          <h3>Créneaux (semaine)</h3>
          <div className="row-wrap">
            {appointmentSlots.map((slot) => (
              <Button
                key={slot}
                variant={state.appointment?.slot === slot ? 'primary' : 'secondary'}
                onClick={() =>
                  updateState((current) => ({
                    ...current,
                    appointment: {
                      advisor: current.appointment?.advisor ?? advisors[0].nom,
                      slot,
                      format: current.appointment?.format ?? 'visio',
                      message: current.appointment?.message ?? '',
                    },
                  }))
                }
              >
                {slot}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <Field label="Format">
        <Radio
          name="format"
          value={state.appointment?.format ?? 'visio'}
          onChange={(value) =>
            updateState((current) => ({
              ...current,
              appointment: {
                advisor: current.appointment?.advisor ?? advisors[0].nom,
                slot: current.appointment?.slot ?? appointmentSlots[0],
                format: value as 'visio' | 'chat' | 'peu importe',
                message: current.appointment?.message ?? '',
              },
            }))
          }
          options={[
            { label: 'Visio', value: 'visio' },
            { label: 'Chat', value: 'chat' },
            { label: 'Peu importe', value: 'peu importe' },
          ]}
        />
      </Field>
      <Field label="Message facultatif">
        <textarea
          value={state.appointment?.message ?? ''}
          onChange={(event) =>
            updateState((current) => ({
              ...current,
              appointment: {
                advisor: current.appointment?.advisor ?? advisors[0].nom,
                slot: current.appointment?.slot ?? appointmentSlots[0],
                format: current.appointment?.format ?? 'visio',
                message: event.target.value,
              },
            }))
          }
        />
      </Field>
      <Button
        onClick={() => {
          setLiveMessage('Rendez-vous envoyé')
        }}
      >
        <Send size={16} /> Envoyer mes disponibilités
      </Button>
      {state.appointment ? (
        <Alert tone="success">
          <CheckCircle2 size={16} /> Confirmation : dossier {state.shareWithCounselor ? 'partagé' : 'non partagé'}, disponibilités envoyées, créneau {state.appointment.slot}, entretien à confirmer.
        </Alert>
      ) : null}
    </section>
  )
}

const EchangePage = () => {
  const { state, updateState } = useApp()
  return (
    <section className="section">
      <h2>Échange avec Gabriel</h2>
      <div className="card">
        {state.messages.map((message) => (
          <p key={message.id}>
            <strong>{message.from === 'conseiller' ? 'Gabriel' : 'Vous'}:</strong> {message.text} <small>({message.at})</small>
          </p>
        ))}
      </div>
      <Field label="Nouveau message">
        <input
          type="text"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && event.currentTarget.value.trim()) {
              updateState((current) => ({
                ...current,
                messages: [
                  ...current.messages,
                  {
                    id: `${Date.now()}`,
                    from: 'lyceen',
                    text: event.currentTarget.value,
                    at: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                  },
                ],
              }))
              event.currentTarget.value = ''
            }
          }}
        />
      </Field>
      {state.appointment ? (
        <div className="card">
          <h3>Rendez-vous planifié</h3>
          <p>
            {state.appointment.slot} • {state.appointment.format}
          </p>
        </div>
      ) : null}
    </section>
  )
}

const EcheancesPage = () => {
  const { state, updateState } = useApp()
  const openDayEvents = programs
    .filter((program) => state.selectedOpenDays.includes(program.portesOuvertes))
    .map((program) => ({ date: program.portesOuvertes, titre: `Portes ouvertes ${program.nom}` }))
  const events = [...officialDeadlines, ...openDayEvents].sort((a, b) => a.date.localeCompare(b.date))
  return (
    <section className="section">
      <h2>Échéances 2027</h2>
      <Alert tone="warning">
        <TriangleAlert size={16} /> Alerte forte : classement des vœux en attente du 5 au 8 juin.
      </Alert>
      <div className="card">
        {events.map((event) => (
          <p key={`${event.date}-${event.titre}`}>
            <CalendarClock size={14} /> {event.date} — {event.titre}
          </p>
        ))}
      </div>
      <Checkbox
        label="Activer les rappels"
        checked={state.remindersEnabled}
        onChange={(event) => updateState((current) => ({ ...current, remindersEnabled: event.target.checked }))}
      />
      <Alert tone="info">Exemple de notification : "Demain, confirmation des vœux avant 18h".</Alert>
    </section>
  )
}

const ConseillerDemandesPage = () => {
  const [requestStatus, setRequestStatus] = useState<'pending' | 'accepted' | 'delegated'>('pending')
  return (
    <section className="section">
      <h2>Demandes d’élèves</h2>
      <div className="card">
        <p>
          <strong>{personas.lead.nom}</strong> — Terminale générale, spécialités Maths + NSI
        </p>
        <p>Propose Lun 17h et Mer 14h. Souhaite comparer BUT, licence et école d’ingénieurs.</p>
        <Status tone="success" text="Correspond à vos domaines" />
        <div className="row-wrap">
          <Button onClick={() => setRequestStatus('accepted')} disabled={requestStatus !== 'pending'}>Accepter Lun 17h</Button>
          <Button variant="secondary" onClick={() => setRequestStatus('delegated')} disabled={requestStatus !== 'pending'}>Laisser à un autre conseiller</Button>
        </div>
        {requestStatus === 'accepted' ? <Alert tone="success"><CheckCircle2 size={16} /> Demande acceptée. Un message fictif a été envoyé à {personas.lead.nom}.</Alert> : null}
        {requestStatus === 'delegated' ? <Alert tone="info">Demande transmise à un autre conseiller fictif.</Alert> : null}
      </div>
    </section>
  )
}

const ConseillerElevesPage = () => {
  const { state } = useApp()
  return (
    <section className="section">
      <h2>Dossiers partagés</h2>
      <div className="card">
        <Status tone={state.shareWithCounselor ? 'success' : 'warning'} text={state.shareWithCounselor ? 'Dossier partagé' : 'En attente de consentement'} />
        <p>Intérêts clés : {domains.filter((domain) => state.student.interests[domain.id] >= 3).map((d) => d.label).join(', ') || 'à préciser'}.</p>
        <p>Préférences : ville {state.student.cityPreference}, apprentissage {state.student.learningStyle}.</p>
        <p>Points à discuter : arbitrer entre sélectivité et part de pratique, clarifier le rythme visé.</p>
        <Field label="Note de suivi">
          <textarea defaultValue="Élève motivée, souhaite comparer BUT et licence avant décision." />
        </Field>
        <Status tone="info" text="Rappel : La décision appartient à l’élève et à sa famille." />
      </div>
    </section>
  )
}

const EtablissementFichesPage = () => {
  const { updateState, setLiveMessage } = useApp()
  const [values, setValues] = useState({
    parcours: programs[2].nom,
    debouches: programs[2].debouches.join(', '),
    vigilance: programs[2].vigilance,
  })
  const [status, setStatus] = useState<'draft' | 'created' | 'published'>('draft')
  return (
    <section className="section">
      <h2>Édition des fiches</h2>
      <div className="card">
        <Field label="Parcours">
          <input value={values.parcours} onChange={(event) => setValues((current) => ({ ...current, parcours: event.target.value }))} />
        </Field>
        <Field label="Débouchés" error={values.debouches.trim() ? undefined : 'Les débouchés sont obligatoires'}>
          <textarea value={values.debouches} onChange={(event) => setValues((current) => ({ ...current, debouches: event.target.value }))} />
        </Field>
        <Field label="Point de vigilance" error={values.vigilance.trim() ? undefined : 'Le point de vigilance est obligatoire'}>
          <textarea value={values.vigilance} onChange={(event) => setValues((current) => ({ ...current, vigilance: event.target.value }))} />
        </Field>
        <div className="row-wrap">
          <Button
            variant="ghost"
            onClick={() => {
              setValues({
                parcours: 'Licence Data & Territoires',
                debouches: 'Data analyst junior, chargé d’études, master géomatique',
                vigilance: 'Autonomie importante et bases en mathématiques recommandées.',
              })
              setStatus('created')
            }}
          >
            Créer une formation fictive
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setValues({
                parcours: 'Cycle ingénieur post-bac',
                debouches: 'Ingénieur logiciel, Ingénieur systèmes, Chef de projet R&D',
                vigilance: 'Sélection forte et charge de travail élevée.',
              })
              setStatus('created')
            }}
          >
            Remplir avec un exemple
          </Button>
          <Button
            onClick={() => {
              if (!values.parcours.trim() || !values.debouches.trim() || !values.vigilance.trim()) {
                setStatus('draft')
                return
              }
              updateState((current) => ({ ...current, publishedFormation: values }))
              setLiveMessage('Formation publiée dans la démo')
              setStatus('published')
            }}
          >
            Publier
          </Button>
        </div>
      </div>
      {status === 'created' ? <Alert tone="info"><CheckCircle2 size={16} /> Formation fictive créée dans votre brouillon.</Alert> : null}
      {status === 'published' ? <Alert tone="success"><CheckCircle2 size={16} /> Formation publiée dans la démo et visible côté lycéen.</Alert> : null}
      <Alert tone="info">Une fiche publiée devient visible côté lycéen.</Alert>
    </section>
  )
}

const EtablissementChiffresPage = () => (
  <section className="section">
    <h2>Chiffres agrégés</h2>
    <div className="grid cards-3">
      <div className="card">
        <h3>Ajouts en favoris</h3>
        <p>64</p>
      </div>
      <div className="card">
        <h3>Comparaisons</h3>
        <p>38</p>
      </div>
      <div className="card">
        <h3>Tendance</h3>
        <p>+12 % / mois</p>
      </div>
    </div>
    <Alert tone="warning">Toute valeur inférieure à 10 est masquée. Aucun tri par résultats, aucun export.</Alert>
  </section>
)

const EtablissementPagePublique = () => {
  const { state } = useApp()
  return (
    <section className="section">
      <h2>Page publique École Aurelis</h2>
      <div className="card">
        <p>Parcours : cycle ingénieur post-bac, passerelles BUT / licence / BTS / prépa.</p>
        <p>Prérequis : base scientifique, curiosité projet, travail collaboratif.</p>
        <p>Effectifs : promotion 95 étudiants. Événements : forum, salon, portes ouvertes, immersion.</p>
      </div>
      {state.publishedFormation ? (
        <div className="card">
          <Status tone="success" text="Formation publiée" />
          <h3>{state.publishedFormation.parcours}</h3>
          <p><strong>Débouchés :</strong> {state.publishedFormation.debouches}</p>
          <p><strong>Point de vigilance :</strong> {state.publishedFormation.vigilance}</p>
        </div>
      ) : <Alert tone="info">Aucune nouvelle formation fictive publiée pour le moment.</Alert>}
    </section>
  )
}

const EtablissementProfilsPage = () => (
  <section className="section">
    <h2>Profils consentants</h2>
    <div className="card">
      <p>
        <strong>Profil 1</strong> — Intéressée par le numérique et les projets concrets. Spécialités Maths + NSI. Question : "Quels stages dès la 1re année ?"
      </p>
      <p>
        <strong>Profil 2</strong> — Attiré par sciences et environnement. Spécialités SVT + Physique-Chimie. Question : "Comment se passe l’alternance ?"
      </p>
      <Alert tone="warning">Jamais de notes scolaires ni de coordonnées personnelles.</Alert>
    </div>
  </section>
)

const RoleRedirect = () => {
  const { state } = useApp()
  return <Navigate to={layoutLinks[state.role]} replace />
}

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/profil/interets" element={<InteretsPage />} />
        <Route path="/profil/preferences" element={<PreferencesPage />} />
        <Route path="/profil/dossier" element={<DossierPage />} />
        <Route path="/pistes" element={<PistesPage />} />
        <Route path="/formation/:id" element={<FormationModalPage />} />
        <Route path="/comparer" element={<ComparePage />} />
        <Route path="/favoris" element={<FavorisPage />} />
        <Route path="/rendez-vous" element={<RendezVousPage />} />
        <Route path="/echange" element={<EchangePage />} />
        <Route path="/echeances" element={<EcheancesPage />} />
        <Route path="/conseiller/demandes" element={<ConseillerDemandesPage />} />
        <Route path="/conseiller/eleves" element={<ConseillerElevesPage />} />
        <Route path="/etablissement/fiches" element={<EtablissementFichesPage />} />
        <Route path="/etablissement/chiffres" element={<EtablissementChiffresPage />} />
        <Route path="/etablissement/page" element={<EtablissementPagePublique />} />
        <Route path="/etablissement/profils" element={<EtablissementProfilsPage />} />
        <Route path="*" element={<RoleRedirect />} />
      </Routes>
    </AppLayout>
  )
}

export default App
