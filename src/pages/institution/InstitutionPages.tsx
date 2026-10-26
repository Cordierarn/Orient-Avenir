import { Check, Info, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../../auth/AuthContext'
import { Alert, Avatar, Button, EmptyState, ErrorState, Field, LoadingState, Radio, RadioGroup, Status, useToast } from '../../components'
import { errorMessage, formationRepo, institutionRepo, ValidationError } from '../../db/repositories'
import type { InstitutionInput } from '../../db/repositories/institutionRepository'
import { useAction, useRepo } from '../../hooks/useRepo'
import { usePageTitle } from '../../hooks/usePageTitle'
import { SchoolView } from '../shared/SchoolPage'
import { InterestStatsTable } from './InterestStatsTable'

export const ChiffresPage = () => {
  usePageTitle('Chiffres d’intérêt')
  const user = useCurrentUser()
  return (
    <div className="container page stack">
      <InterestStatsTable userId={user.id} headingLevel={1} />
      <p className="small muted cluster" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
        <Info size={16} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
        Les chiffres additionnent les ajouts en favoris et les comparaisons des comptes lycéens, sans jamais identifier personne. Aucun export n’est proposé.
      </p>
    </div>
  )
}

export const SchoolPreviewPage = () => {
  usePageTitle('Page de l’école')
  const user = useCurrentUser()
  return <div className="container page">{user.institutionId ? <SchoolView institutionId={user.institutionId} preview /> : null}</div>
}

export const ProfilesPage = () => {
  usePageTitle('Profils intéressés')
  const user = useCurrentUser()
  const { notify } = useToast()
  const formations = useRepo(() => formationRepo.listForInstitution(user.id), [user.id])
  const [selected, setSelected] = useState<string | null>(null)
  const published = (formations.data ?? []).filter((f) => f.status === 'publiee')
  const formationId = selected ?? published[0]?.id ?? formations.data?.[0]?.id ?? null
  const profiles = useRepo(
    () => (formationId ? institutionRepo.listInterestedProfiles(user.id, formationId) : Promise.resolve(null)),
    [user.id, formationId],
  )

  const invite = useAction(async (studentId: string, firstName: string) => {
    if (!formationId) return
    try {
      const result = await institutionRepo.inviteToOpenDay(user.id, formationId, studentId)
      notify(result.alreadyInvited ? `${firstName} a déjà reçu l’invitation ou est inscrit·e.` : `Invitation envoyée à ${firstName} : elle apparaît dans ses échéances.`, 'success')
    } catch (e) {
      notify(errorMessage(e, 'L’invitation n’a pas pu être envoyée. Réessayez.'), 'error')
    }
  })

  if (formations.loading) return <div className="container page"><LoadingState /></div>
  if (formations.error) return <div className="container page"><ErrorState what="vos formations" error={formations.error} /></div>

  return (
    <div className="container page stack">
      <div>
        <h1 className="h1">Lycéens intéressés par vos parcours</h1>
        <p className="lead">
          Profils simplifiés, écrits en langage courant, visibles seulement si l’élève l’a accepté. Ils servent à préparer vos portes ouvertes et vos réponses, pas à
          présélectionner.
        </p>
      </div>
      <Alert tone="info" title="Ce que vous ne voyez jamais">
        Notes, moyennes, nom de famille et coordonnées. Les profils ne peuvent être ni triés par résultats, ni exportés.
      </Alert>
      <div className="cluster" role="group" aria-label="Choisir un parcours">
        {(formations.data ?? []).map((f) => (
          <button key={f.id} type="button" className="chip" aria-pressed={f.id === formationId} onClick={() => setSelected(f.id)}>
            {f.id === formationId ? <Check size={14} aria-hidden="true" /> : null} {f.title}
          </button>
        ))}
      </div>
      {profiles.loading ? <LoadingState label="Chargement des profils…" /> : null}
      {profiles.error ? <ErrorState what="les profils" error={profiles.error} /> : null}
      {profiles.data && !profiles.data.profiles.length ? (
        <div className="card">
          <EmptyState icon={<Users size={20} />} title="Aucun profil visible pour ce parcours">
            Aucun lycéen intéressé n’a, pour l’instant, accepté de rendre son profil visible.
          </EmptyState>
        </div>
      ) : null}
      {profiles.data?.profiles.length ? (
        <div className="grid-3">
          {profiles.data.profiles.map((p) => (
            <article key={p.studentId} className="card card-lg stack-sm" aria-labelledby={`profile-${p.studentId}`}>
              <div className="cluster">
                <Avatar text={p.firstName.charAt(0)} />
                <h2 id={`profile-${p.studentId}`} className="h3">
                  {p.firstName}, {p.classe}
                </h2>
              </div>
              <p>« {p.summary} »</p>
              <dl className="stack-sm small" style={{ margin: 0 }}>
                <div>
                  <dt className="overline muted">Spécialités</dt>
                  <dd style={{ margin: 0 }}>{p.specialites.join(', ') || 'Non renseignées'}</dd>
                </div>
                <div>
                  <dt className="overline muted">Questions posées</dt>
                  <dd style={{ margin: 0 }}>{p.questions}</dd>
                </div>
              </dl>
              <div>
                {p.openDay === 'inscrit' ? (
                  <Status tone="success">Inscrit·e aux portes ouvertes</Status>
                ) : p.openDay === 'invite' ? (
                  <Status tone="info">Invitation envoyée</Status>
                ) : (
                  <Status>Pas encore inscrit·e</Status>
                )}
              </div>
              <Button variant="secondary" block disabled={p.openDay !== 'aucun' || invite.pending} onClick={() => void invite.run(p.studentId, p.firstName)}>
                {p.openDay === 'aucun' ? 'Inviter aux portes ouvertes' : p.openDay === 'invite' ? 'Invitation envoyée' : 'Déjà inscrit·e'}
                <span className="visually-hidden"> : {p.firstName}</span>
              </Button>
            </article>
          ))}
        </div>
      ) : null}
      {profiles.data ? (
        <p className="small muted cluster">
          <Info size={16} aria-hidden="true" /> {profiles.data.totalLabel} lycéens ont rendu leur profil visible pour ce parcours. En dessous de 10, seul un total est affiché.
        </p>
      ) : null}
    </div>
  )
}

/** Rattachement d'un nouveau compte établissement : choix ou création de l'établissement. */
export const InstitutionOnboardingPage = () => {
  usePageTitle('Votre établissement')
  const user = useCurrentUser()
  const navigate = useNavigate()
  const { notify } = useToast()
  const institutions = useRepo(() => institutionRepo.listInstitutions(), [])
  const [mode, setMode] = useState<'existant' | 'nouveau'>('existant')
  const [choice, setChoice] = useState('')
  const [input, setInput] = useState<InstitutionInput>({ name: '', kind: '', city: '', citySize: '', sector: '', distanceKm: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof InstitutionInput | 'choice', string>>>({})
  const [formError, setFormError] = useState('')

  const submit = useAction(async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    setErrors({})
    try {
      if (mode === 'existant') {
        if (!choice) {
          setErrors({ choice: 'Choisissez votre établissement dans la liste, ou créez-le.' })
          return
        }
        await institutionRepo.attachToInstitution(user.id, choice)
      } else {
        await institutionRepo.createInstitution(user.id, input)
      }
      notify('Votre compte est rattaché à votre établissement.', 'success')
      navigate('/etablissement/fiches', { replace: true })
    } catch (e) {
      if (e instanceof ValidationError) {
        setErrors(e.fieldErrors)
        setFormError('Certaines informations manquent. Vos saisies sont conservées.')
      } else setFormError(errorMessage(e, 'Le rattachement a échoué. Réessayez.'))
    }
  })

  const set = (key: keyof InstitutionInput, value: string) => setInput((current) => ({ ...current, [key]: value }))

  return (
    <div className="container page">
      <form className="card card-lg stack" style={{ maxWidth: 720 }} onSubmit={(e) => void submit.run(e)} noValidate>
        <div>
          <h1 className="h1">Votre établissement</h1>
          <p className="lead">Choisissez l’établissement que vous représentez, ou créez-le. Vous pourrez ensuite gérer ses fiches formation.</p>
        </div>
        {formError ? <Alert tone="error" title="Rattachement impossible" role="alert">{formError}</Alert> : null}
        <RadioGroup
          legend={<span className="field-label">Je souhaite</span>}
          name="mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'existant', label: 'Choisir un établissement existant' },
            { value: 'nouveau', label: 'Créer mon établissement' },
          ]}
        />
        {mode === 'existant' ? (
          <fieldset className="fieldset-card" aria-describedby={errors.choice ? 'choice-error' : undefined}>
            <legend>Établissements de la démonstration</legend>
            {institutions.loading ? <LoadingState /> : null}
            <div className="stack-sm" style={{ gap: 0 }}>
              {(institutions.data ?? []).map((i) => (
                <Radio key={i.id} name="institution" label={`${i.name} · ${i.city}`} checked={choice === i.id} onChange={() => setChoice(i.id)} />
              ))}
            </div>
            {errors.choice ? (
              <p id="choice-error" className="field-error">
                {errors.choice}
              </p>
            ) : null}
          </fieldset>
        ) : (
          <div className="stack">
            <Field label="Nom de l’établissement" required error={errors.name}>
              <input className="input" value={input.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="Type d’établissement" required error={errors.kind} help="Exemple : Université, Lycée, École d’ingénieurs">
              <input className="input" value={input.kind} onChange={(e) => set('kind', e.target.value)} />
            </Field>
            <div className="grid-2">
              <Field label="Ville" required error={errors.city}>
                <input className="input" value={input.city} onChange={(e) => set('city', e.target.value)} />
              </Field>
              <Field label="Distance depuis Valmont (km)" required error={errors.distanceKm}>
                <input className="input" inputMode="numeric" value={input.distanceKm} onChange={(e) => set('distanceKm', e.target.value)} />
              </Field>
            </div>
            <RadioGroup
              className="fieldset-card"
              legend="Taille de la ville"
              name="citySize"
              value={input.citySize || undefined}
              onChange={(v) => set('citySize', v)}
              error={errors.citySize}
              options={[
                { value: 'grande', label: 'Grande ville' },
                { value: 'moyenne', label: 'Ville moyenne' },
                { value: 'petite', label: 'Petite ville' },
              ]}
            />
            <RadioGroup
              className="fieldset-card"
              legend="Statut"
              name="sector"
              value={input.sector || undefined}
              onChange={(v) => set('sector', v)}
              error={errors.sector}
              options={[
                { value: 'public', label: 'Public' },
                { value: 'prive', label: 'Privé' },
              ]}
            />
          </div>
        )}
        <div>
          <Button type="submit" arrow loading={submit.pending} loadingLabel="Enregistrement…">
            Continuer
          </Button>
        </div>
      </form>
    </div>
  )
}
