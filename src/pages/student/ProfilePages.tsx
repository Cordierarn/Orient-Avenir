import { Check, FileText, Info, Lightbulb, Lock } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../../auth/AuthContext'
import { Alert, Button, Checkbox, Field, FieldError, IconChip, LevelSlider, LoadingState, ErrorState, RadioGroup, Status, Stepper, Tag, useToast } from '../../components'
import { cityLabels, domainChipLabels, domains, durationLabels, learningLabels, specialites, strongDomains } from '../../data/domains'
import { errorMessage, studentRepo, ValidationError } from '../../db/repositories'
import type { PreferenceField, PreferencesInput } from '../../db/repositories/studentRepository'
import { useAction } from '../../hooks/useRepo'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useOwnProfile } from '../../hooks/useStudent'
import { formatGrade } from '../../lib/text'
import type { CityPreference, DomainId, DurationPreference, LearningPreference, Level, StudentProfile } from '../../types'

const ProfileFrame = ({ step, done, children, aside }: { step: number; done: number[]; children: React.ReactNode; aside: React.ReactNode }) => (
  <div className="container page">
    <Stepper current={step} done={done} />
    <div className="layout-aside">
      <section className="card card-lg">{children}</section>
      <aside className="card card-lg stack sticky">{aside}</aside>
    </div>
  </div>
)

const useProfileOrState = () => {
  const user = useCurrentUser()
  const { data, error, loading } = useOwnProfile(user.id)
  return { user, profile: data, state: loading ? <div className="container page"><LoadingState label="Chargement de votre profil…" /></div> : error ? <div className="container page"><ErrorState what="votre profil" error={error} /></div> : null }
}

// ---------------------------------------------------------------------------
// Étape 1 : intérêts
// ---------------------------------------------------------------------------

export const InterestsPage = () => {
  usePageTitle('Vos intérêts')
  const { user, profile, state } = useProfileOrState()
  return state ?? <InterestsForm userId={user.id} profile={profile!} />
}

const InterestsForm = ({ userId, profile }: { userId: string; profile: StudentProfile }) => {
  const [interests, setInterests] = useState<Partial<Record<DomainId, Level>>>(profile.interests)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const navigate = useNavigate()
  const { notify } = useToast()
  const missing = domains.filter((d) => interests[d.id] === undefined).length

  const save = useAction(async (next: 'continue' | 'later') => {
    setError('')
    try {
      await studentRepo.saveInterests(userId, interests)
      setSaved(true)
      if (next === 'continue') navigate('/profil/preferences')
      else notify('Vos intérêts sont enregistrés : vous pourrez reprendre plus tard.', 'success')
    } catch (e) {
      setError(errorMessage(e, 'Vos réponses n’ont pas pu être enregistrées. Elles restent affichées : réessayez.'))
    }
  })

  return (
    <ProfileFrame
      step={1}
      done={profile.completedSteps}
      aside={
        <>
          <IconChip>
            <Lightbulb size={20} />
          </IconChip>
          <h2 className="h2">Pourquoi ces questions ?</h2>
          <p className="small muted">Vos réponses servent uniquement à calculer des pistes. Chaque piste affichera la part de chaque critère :</p>
          <ul className="list-reset stack-sm">
            {[
              ['Vos intérêts', '≈ 50 %'],
              ['Vos spécialités', '≈ 30 %'],
              ['Vos préférences', '≈ 20 %'],
            ].map(([label, value]) => (
              <li key={label} className="surface-2 spread small strong" style={{ padding: '8px 12px' }}>
                <span>{label}</span>
                <span>{value}</span>
              </li>
            ))}
          </ul>
          <p className="small cluster" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            <Lock size={16} aria-hidden="true" className="text-ok" style={{ flex: 'none', marginTop: 2 }} />
            Rien n’est envoyé : vos réponses restent sur cet appareil tant que vous ne décidez pas de les partager.
          </p>
        </>
      }
    >
      <div className="stack">
        <div>
          <h1 className="h1">Qu’est-ce qui vous attire ?</h1>
          <p className="lead">Indiquez votre intérêt pour chaque domaine. Il n’y a pas de bonne réponse et vous pourrez tout modifier.</p>
        </div>
        <p className="surface-info small cluster" style={{ padding: '8px 12px' }}>
          <Info size={16} aria-hidden="true" className="accent" /> Cliquez ou glissez sur une barre, ou utilisez les flèches du clavier, pour choisir un niveau.
        </p>
        {error ? <Alert tone="error" title="Enregistrement impossible" role="alert">{error}</Alert> : null}
        <div role="group" aria-label="Niveau d’intérêt par domaine">
          {domains.map((domain) => (
            <LevelSlider
              key={domain.id}
              label={domain.label}
              value={interests[domain.id]}
              onChange={(value) => {
                setSaved(false)
                setInterests((current) => ({ ...current, [domain.id]: value }))
              }}
            />
          ))}
        </div>
        {missing ? (
          <p className="small muted" role="status">
            {missing} domaine{missing > 1 ? 's' : ''} non renseigné{missing > 1 ? 's' : ''} : ils compteront comme neutres dans le calcul.
          </p>
        ) : null}
        <div className="form-footer">
          <Link className="link-button" to="/">
            Retour à l’accueil
          </Link>
          <div className="form-footer-end">
            <Button variant="ghost" onClick={() => void save.run('later')} disabled={save.pending}>
              {saved ? 'Enregistré' : 'Enregistrer et reprendre plus tard'}
            </Button>
            <span className="small muted">Étape 1 sur 4</span>
            <Button arrow loading={save.pending} loadingLabel="Enregistrement…" onClick={() => void save.run('continue')}>
              Continuer
            </Button>
          </div>
        </div>
      </div>
    </ProfileFrame>
  )
}

// ---------------------------------------------------------------------------
// Étape 2 : préférences
// ---------------------------------------------------------------------------

export const PreferencesPage = () => {
  usePageTitle('Vos préférences')
  const { user, profile, state } = useProfileOrState()
  return state ?? <PreferencesForm userId={user.id} profile={profile!} />
}

const PreferencesForm = ({ userId, profile }: { userId: string; profile: StudentProfile }) => {
  const [input, setInput] = useState<PreferencesInput>({
    specialites: profile.specialites,
    city: profile.city,
    duration: profile.duration,
    learning: profile.learning,
    alternance: profile.alternance,
  })
  const [errors, setErrors] = useState<Partial<Record<PreferenceField, string>>>({})
  const [formError, setFormError] = useState('')
  const navigate = useNavigate()
  const strong = strongDomains(profile.interests)

  const toggleSpecialite = (name: string, checked: boolean) => {
    setErrors((e) => ({ ...e, specialites: undefined }))
    setInput((current) => {
      if (checked && current.specialites.length >= 2) {
        setErrors((e) => ({ ...e, specialites: 'Vous avez déjà coché deux spécialités : décochez-en une pour en choisir une autre.' }))
        return current
      }
      return { ...current, specialites: checked ? [...current.specialites, name] : current.specialites.filter((s) => s !== name) }
    })
  }

  const save = useAction(async () => {
    setFormError('')
    try {
      await studentRepo.savePreferences(userId, input)
      navigate('/profil/dossier')
    } catch (e) {
      if (e instanceof ValidationError) {
        setErrors(e.fieldErrors)
        setFormError(`${Object.keys(e.fieldErrors).length} réponse${Object.keys(e.fieldErrors).length > 1 ? 's' : ''} à compléter. Vos autres choix sont conservés.`)
      } else setFormError(errorMessage(e, 'Vos préférences n’ont pas pu être enregistrées. Réessayez.'))
    }
  })

  const set = <K extends keyof PreferencesInput>(key: K, value: PreferencesInput[K]) => {
    setInput((current) => ({ ...current, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  return (
    <ProfileFrame
      step={2}
      done={profile.completedSteps}
      aside={
        <>
          <h2 className="h2">Vos intérêts forts</h2>
          {strong.length ? (
            <div className="cluster">
              {strong.map((d) => (
                <Tag key={d.id}>{domainChipLabels[d.id]}</Tag>
              ))}
            </div>
          ) : (
            <p className="small muted">Aucun intérêt renseigné pour le moment.</p>
          )}
          <Link className="link-button" to="/profil/interets">
            Modifier mes intérêts
          </Link>
          <p className="surface-2 small cluster" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            <Info size={16} aria-hidden="true" className="accent" style={{ flex: 'none', marginTop: 2 }} />
            Vous pourrez revenir sur ces réponses à tout moment depuis « Mon profil ». Les pistes se mettront à jour.
          </p>
        </>
      }
    >
      <div className="stack">
        <div>
          <h1 className="h1">Vos préférences</h1>
          <p className="lead">Ces réponses affinent les pistes. Aucune n’est éliminatoire.</p>
        </div>
        {formError ? <Alert tone="error" title="Préférences incomplètes" role="alert">{formError}</Alert> : null}
        <fieldset className="fieldset-card" aria-describedby="spe-help spe-error">
          <legend>Spécialités suivies en terminale</legend>
          <p id="spe-help" className="field-help">
            Cochez vos deux spécialités.
          </p>
          <div className="cluster" style={{ columnGap: 20, rowGap: 0 }}>
            {specialites.map((name) => (
              <Checkbox key={name} label={name} checked={input.specialites.includes(name)} onChange={(e) => toggleSpecialite(name, e.target.checked)} />
            ))}
          </div>
          <FieldError id="spe-error">{errors.specialites}</FieldError>
        </fieldset>
        <RadioGroup
          className="fieldset-card"
          legend="Type de ville"
          name="city"
          value={input.city}
          onChange={(v) => set('city', v as CityPreference)}
          error={errors.city}
          options={(Object.keys(cityLabels) as CityPreference[]).map((value) => ({ value, label: cityLabels[value] }))}
        />
        <RadioGroup
          className="fieldset-card"
          legend="Durée d’études envisagée"
          name="duration"
          value={input.duration}
          onChange={(v) => set('duration', v as DurationPreference)}
          error={errors.duration}
          options={(Object.keys(durationLabels) as DurationPreference[]).map((value) => ({ value, label: durationLabels[value] }))}
        />
        <RadioGroup
          className="fieldset-card"
          legend="Façon d’apprendre"
          name="learning"
          value={input.learning}
          onChange={(v) => set('learning', v as LearningPreference)}
          error={errors.learning}
          options={(Object.keys(learningLabels) as LearningPreference[]).map((value) => ({ value, label: learningLabels[value] }))}
        />
        <fieldset className="fieldset-card">
          <legend>Alternance</legend>
          <Checkbox label="L’alternance m’intéresse" checked={input.alternance} onChange={(e) => set('alternance', e.target.checked)} />
        </fieldset>
        <div className="form-footer">
          <Link className="link-button" to="/profil/interets">
            Précédent
          </Link>
          <div className="form-footer-end">
            <span className="small muted">Étape 2 sur 4</span>
            <Button arrow loading={save.pending} loadingLabel="Enregistrement…" onClick={() => void save.run()}>
              Continuer
            </Button>
          </div>
        </div>
      </div>
    </ProfileFrame>
  )
}

// ---------------------------------------------------------------------------
// Étape 3 : dossier (facultatif)
// ---------------------------------------------------------------------------

export const DossierPage = () => {
  usePageTitle('Votre dossier scolaire')
  const { user, profile, state } = useProfileOrState()
  return state ?? <DossierForm userId={user.id} profile={profile!} />
}

/** Valeurs lues dans le bulletin simulé (aucun fichier n'est conservé). */
const SIMULATED_BULLETIN = { first: '14,5', second: '16', Français: '12', 'Moyenne générale': '13,8' }

const DossierForm = ({ userId, profile }: { userId: string; profile: StudentProfile }) => {
  const subjects = [...(profile.specialites.length ? profile.specialites : ['Mathématiques', 'NSI']), 'Français', 'Moyenne générale']
  const [raw, setRaw] = useState<Record<string, string>>(() => Object.fromEntries(subjects.map((s) => [s, formatGrade(profile.grades[s])])))
  const [useGrades, setUseGrades] = useState<'oui' | 'non'>(profile.useGrades || !Object.keys(profile.grades).length ? 'oui' : 'non')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [bulletin, setBulletin] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { notify } = useToast()

  useEffect(() => setErrors({}), [raw])

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!/pdf|image\//.test(file.type) && !/\.(pdf|png|jpe?g|heic)$/i.test(file.name)) {
      setBulletin('Format non pris en charge : choisissez un PDF ou une photo (JPG, PNG).')
      return
    }
    // Lecture simulée : le fichier n'est ni lu ni conservé.
    setRaw((current) => ({
      ...current,
      [subjects[0]]: SIMULATED_BULLETIN.first,
      [subjects[1]]: SIMULATED_BULLETIN.second,
      Français: SIMULATED_BULLETIN.Français,
      'Moyenne générale': SIMULATED_BULLETIN['Moyenne générale'],
    }))
    setBulletin(`Bulletin « ${file.name} » lu (simulation). Vérifiez les moyennes ci-dessous avant de valider : le fichier n’est pas conservé.`)
  }

  const save = useAction(async () => {
    setFormError('')
    try {
      await studentRepo.saveDossier(userId, raw, useGrades === 'oui')
      navigate('/pistes')
    } catch (e) {
      if (e instanceof ValidationError) {
        setErrors(e.fieldErrors as Record<string, string>)
        setFormError(e.message)
      } else setFormError(errorMessage(e, 'Vos moyennes n’ont pas pu être enregistrées. Elles restent affichées : réessayez.'))
    }
  })

  const skip = useAction(async () => {
    try {
      await studentRepo.skipDossier(userId)
      navigate('/pistes')
    } catch (e) {
      setFormError(errorMessage(e, 'Impossible de passer cette étape pour le moment. Réessayez.'))
    }
  })

  const clear = useAction(async () => {
    await studentRepo.clearGrades(userId)
    setRaw(Object.fromEntries(subjects.map((s) => [s, ''])))
    notify('Vos moyennes ont été supprimées de cet appareil.', 'success')
  })

  const hasGrades = Object.keys(profile.grades).length > 0

  return (
    <ProfileFrame
      step={3}
      done={profile.completedSteps}
      aside={
        <>
          <IconChip tone="ok">
            <Lock size={20} />
          </IconChip>
          <h2 className="h2">Vos résultats restent à vous</h2>
          <ul className="check-list">
            {['Gardés sur cet appareil', 'Jamais transmis aux écoles ni au conseiller', 'Supprimables à tout moment depuis « Mon profil »'].map((t) => (
              <li key={t}>
                <span className="check-icon" aria-hidden="true">
                  <Check size={14} />
                </span>
                <span className="small">{t}</span>
              </li>
            ))}
          </ul>
          <p className="surface-2 small cluster" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            <Info size={16} aria-hidden="true" className="accent" style={{ flex: 'none', marginTop: 2 }} />
            Pourquoi vos notes ? Pour afficher des repères réalistes et vous aider à équilibrer votre liste entre pistes sûres et pistes ambitieuses.
          </p>
          {hasGrades ? (
            <Button variant="secondary" onClick={() => void clear.run()} loading={clear.pending}>
              Supprimer mes moyennes
            </Button>
          ) : null}
        </>
      }
    >
      <div className="stack">
        <div className="cluster">
          <h1 className="h1">Votre dossier scolaire</h1>
          <Status>Facultatif</Status>
        </div>
        <p className="muted">Vos résultats servent uniquement à calculer les repères « profils proches » des années passées. Sans eux, vous obtenez quand même vos pistes.</p>
        {formError ? <Alert tone="error" title="Dossier non enregistré" role="alert">{formError}</Alert> : null}
        <div className="surface-info spread" style={{ border: '1.5px dashed var(--color-accent)' }}>
          <span className="cluster" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', maxWidth: 380 }}>
            <FileText size={20} aria-hidden="true" className="accent" style={{ flex: 'none' }} />
            <span>
              <span className="strong">Importer un bulletin (PDF ou photo)</span>
              <br />
              <span className="small muted">Les moyennes sont lues automatiquement, vous les vérifiez avant de valider. Le fichier n’est pas conservé.</span>
            </span>
          </span>
          <input ref={fileRef} type="file" accept="application/pdf,image/*" className="visually-hidden" id="bulletin" onChange={onFile} tabIndex={-1} />
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            Choisir un fichier
          </Button>
        </div>
        {bulletin ? <Alert tone={bulletin.startsWith('Format') ? 'error' : 'info'} role="status">{bulletin}</Alert> : null}
        <h2 className="h3">Ou saisissez vos moyennes du premier trimestre</h2>
        <div className="grid-2">
          {subjects.map((subject) => (
            <Field key={subject} label={subject} error={errors[subject]}>
              <input
                className="input"
                inputMode="decimal"
                placeholder="Ex. 14,5"
                value={raw[subject] ?? ''}
                onChange={(e) => setRaw((current) => ({ ...current, [subject]: e.target.value }))}
              />
            </Field>
          ))}
        </div>
        <RadioGroup
          className="fieldset-card"
          legend="Utiliser mes résultats pour les repères"
          name="use-grades"
          value={useGrades}
          onChange={setUseGrades}
          options={[
            { value: 'oui', label: 'Oui, sur cet appareil uniquement' },
            { value: 'non', label: 'Non' },
          ]}
        />
        <div className="form-footer">
          <Link className="link-button" to="/profil/preferences">
            Précédent
          </Link>
          <div className="form-footer-end">
            <span className="small muted">Étape 3 sur 4</span>
            <Button variant="secondary" onClick={() => void skip.run()} disabled={skip.pending || save.pending}>
              Passer cette étape
            </Button>
            <Button arrow loading={save.pending} loadingLabel="Enregistrement…" onClick={() => void save.run()}>
              Voir mes pistes
            </Button>
          </div>
        </div>
      </div>
    </ProfileFrame>
  )
}

