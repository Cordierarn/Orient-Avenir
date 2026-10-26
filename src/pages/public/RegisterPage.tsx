import { Building2, GraduationCap, Info, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { homeFor } from '../../auth/routing'
import { Alert, Button, Checkbox, Field, FieldError, Logo, Modal, useToast } from '../../components'
import { authRepo, errorMessage, ValidationError } from '../../db/repositories'
import { validateRegistration, type RegistrationField, type RegistrationInput } from '../../db/repositories/authRepository'
import { useAction } from '../../hooks/useRepo'
import { usePageTitle } from '../../hooks/usePageTitle'
import type { Role } from '../../types'

const ROLES: Array<{ value: Role; label: string; text: string; icon: typeof Users }> = [
  { value: 'lyceen', label: 'Lycéen', text: 'Questionnaire, pistes, favoris', icon: GraduationCap },
  { value: 'conseiller', label: 'Conseiller', text: 'Dossiers partagés, entretiens', icon: Users },
  { value: 'etablissement', label: 'Établissement', text: 'Fiches et chiffres agrégés', icon: Building2 },
]

export const RegisterPage = () => {
  usePageTitle('Créer un compte')
  const [params] = useSearchParams()
  const initialRole = (['lyceen', 'conseiller', 'etablissement'] as const).find((r) => r === params.get('role')) ?? ''
  const { register } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [input, setInput] = useState<RegistrationInput>({
    role: initialRole,
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  })
  const [touched, setTouched] = useState<Partial<Record<RegistrationField, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [serverErrors, setServerErrors] = useState<Partial<Record<RegistrationField, string>>>({})
  const [formError, setFormError] = useState('')
  const [termsOpen, setTermsOpen] = useState(false)

  const liveErrors = validateRegistration(input)
  const show = (field: RegistrationField) => serverErrors[field] ?? (submitted || touched[field] ? liveErrors[field] : undefined)
  const set = <K extends RegistrationField>(field: K, value: RegistrationInput[K]) => {
    setInput((current) => ({ ...current, [field]: value }))
    setServerErrors((current) => ({ ...current, [field]: undefined }))
  }
  const blur = (field: RegistrationField) => () => setTouched((current) => ({ ...current, [field]: true }))

  const checkEmail = async () => {
    setTouched((current) => ({ ...current, email: true }))
    if (!liveErrors.email && (await authRepo.isEmailTaken(input.email))) {
      setServerErrors((current) => ({
        ...current,
        email: 'Un compte existe déjà avec cette adresse e-mail dans ce navigateur. Connectez-vous ou utilisez une autre adresse.',
      }))
    }
  }

  const submit = useAction(async (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    setFormError('')
    if (Object.keys(liveErrors).length) {
      setFormError(`${Object.keys(liveErrors).length} champ${Object.keys(liveErrors).length > 1 ? 's' : ''} à corriger avant de créer votre compte.`)
      return
    }
    try {
      const user = await register(input)
      notify(`Bienvenue ${user.firstName} ! Votre compte est créé dans ce navigateur.`, 'success')
      navigate(user.role === 'lyceen' ? '/profil/interets' : homeFor(user), { replace: true })
    } catch (error) {
      if (error instanceof ValidationError) {
        setServerErrors(error.fieldErrors)
        setFormError('Certains champs sont à corriger. Vos saisies sont conservées.')
      } else setFormError(errorMessage(error, 'La création du compte a échoué : la base locale n’a pas répondu. Vos saisies sont conservées, réessayez.'))
    }
  })

  return (
    <div className="container page">
      <div className="stack-lg" style={{ maxWidth: 640, margin: '0 auto' }}>
        <Logo to="/connexion" />
        <main id="contenu" className="card card-lg stack">
          <div>
            <h1 className="h1">Créer un compte</h1>
            <p className="lead">Choisissez votre espace, puis renseignez vos informations.</p>
          </div>
          <Alert tone="info" title="Prototype : comptes stockés uniquement dans ce navigateur">
            Aucun serveur : votre mot de passe est haché localement et rien n’est envoyé.
          </Alert>
          {formError ? (
            <Alert tone="error" title="Le compte n’est pas encore créé" role="alert">
              {formError}
            </Alert>
          ) : null}
          <form className="stack" onSubmit={(e) => void submit.run(e)} noValidate>
            <fieldset aria-describedby={show('role') ? 'role-error' : undefined}>
              <legend className="field-label" style={{ marginBottom: 8 }}>
                Je suis <span className="field-required" aria-hidden="true">*</span>
              </legend>
              <div className="grid-3">
                {ROLES.map(({ value, label, text, icon: Icon }) => (
                  <label key={value} className={`card card-flat choice ${input.role === value ? 'card-selected' : ''}`} style={{ alignItems: 'flex-start', padding: 14 }}>
                    <input type="radio" name="role" value={value} checked={input.role === value} onChange={() => set('role', value)} onBlur={blur('role')} />
                    <span className="choice-box" aria-hidden="true" style={{ borderRadius: '50%' }} />
                    <span className="stack-sm" style={{ gap: 2 }}>
                      <span className="strong cluster" style={{ gap: 6 }}>
                        <Icon size={18} aria-hidden="true" /> {label}
                      </span>
                      <span className="small muted">{text}</span>
                    </span>
                  </label>
                ))}
              </div>
              <FieldError id="role-error">{show('role')}</FieldError>
            </fieldset>
            <div className="grid-2">
              <Field label="Prénom" required error={show('firstName')}>
                <input className="input" autoComplete="given-name" value={input.firstName} onChange={(e) => set('firstName', e.target.value)} onBlur={blur('firstName')} />
              </Field>
              <Field label="Nom" required error={show('lastName')}>
                <input className="input" autoComplete="family-name" value={input.lastName} onChange={(e) => set('lastName', e.target.value)} onBlur={blur('lastName')} />
              </Field>
            </div>
            <Field label="Adresse e-mail" required help="Elle sert uniquement à vous connecter sur cet appareil." error={show('email')}>
              <input
                className="input"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={input.email}
                onChange={(e) => set('email', e.target.value)}
                onBlur={() => void checkEmail()}
              />
            </Field>
            <Field label="Mot de passe" required help="8 caractères minimum." error={show('password')}>
              <input className="input" type="password" autoComplete="new-password" value={input.password} onChange={(e) => set('password', e.target.value)} onBlur={blur('password')} />
            </Field>
            <Field label="Confirmation du mot de passe" required error={show('confirmPassword')}>
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                value={input.confirmPassword}
                onChange={(e) => set('confirmPassword', e.target.value)}
                onBlur={blur('confirmPassword')}
              />
            </Field>
            <div>
              <Checkbox
                label={
                  <>
                    J’accepte les conditions d’utilisation <span className="field-required" aria-hidden="true">*</span>
                  </>
                }
                checked={input.acceptTerms}
                onChange={(e) => set('acceptTerms', e.target.checked)}
                aria-describedby={show('acceptTerms') ? 'terms-error' : undefined}
                aria-invalid={show('acceptTerms') ? true : undefined}
              />
              <button type="button" className="link-button small" onClick={() => setTermsOpen(true)}>
                <Info size={16} aria-hidden="true" /> Lire les conditions d’utilisation
              </button>
              <FieldError id="terms-error">{show('acceptTerms')}</FieldError>
            </div>
            <Button type="submit" block arrow loading={submit.pending} loadingLabel="Création du compte…">
              Créer mon compte
            </Button>
          </form>
          <p className="small" style={{ textAlign: 'center' }}>
            Déjà un compte ?{' '}
            <Link to="/connexion" className="strong">
              Se connecter
            </Link>
          </p>
        </main>
      </div>
      <Modal open={termsOpen} title="Conditions d’utilisation" onClose={() => setTermsOpen(false)}>
        <ul className="stack-sm small">
          <li>Orient’Avenir est un prototype pédagogique : toutes les données sont fictives.</li>
          <li>Vos données restent dans ce navigateur (IndexedDB). Aucun serveur ne les reçoit.</li>
          <li>Les pistes sont des repères de discussion, jamais une décision ni une chance d’admission.</li>
          <li>Vos moyennes ne sont jamais montrées à un conseiller ni à un établissement.</li>
          <li>Tout partage est désactivé par défaut, explicite, daté et révocable à tout moment.</li>
          <li>Pour candidater, utilisez la plateforme officielle.</li>
        </ul>
      </Modal>
    </div>
  )
}
