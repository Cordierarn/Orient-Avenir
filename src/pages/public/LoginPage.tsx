import { ArrowRight, Briefcase, CalendarDays, Columns2, Lightbulb, MessageCircle, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { homeFor, isPathAllowed } from '../../auth/routing'
import { Alert, Avatar, Button, Checkbox, Field, Logo, ROLE_LABELS, useToast } from '../../components'
import { authRepo, AuthError, errorMessage } from '../../db/repositories'
import { useAction, useRepo } from '../../hooks/useRepo'
import { usePageTitle } from '../../hooks/usePageTitle'
import { initials } from '../../lib/text'
import type { PublicUser } from '../../types'

const DEMO_DESCRIPTIONS: Record<string, string> = {
  lyceen: 'Lycéenne · terminale générale Maths + NSI',
  conseiller: 'Conseiller d’orientation indépendant',
  etablissement: 'Responsable des admissions · École d’ingénieurs d’Aurelis',
}

export const useAfterLogin = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  return (user: PublicUser) => {
    const target = from && from !== '/connexion' && isPathAllowed(from.split('?')[0], user.role) && (user.role === 'lyceen' || user.onboarded) ? from : homeFor(user)
    navigate(target, { replace: true })
  }
}

export const LoginPage = () => {
  usePageTitle('Connexion')
  const { login, loginDemo, enterGuest } = useAuth()
  const { notify } = useToast()
  const afterLogin = useAfterLogin()
  const location = useLocation()
  const state = location.state as { loggedOut?: boolean; from?: string } | null
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})
  const { data: demos, error: demoError } = useRepo(() => authRepo.listDemoAccounts(), [])

  const submit = useAction(async (event: FormEvent) => {
    event.preventDefault()
    setErrors({})
    try {
      afterLogin(await login(email, password, remember))
    } catch (error) {
      if (error instanceof AuthError && error.field) setErrors({ [error.field]: error.message })
      else setErrors({ form: errorMessage(error, 'La connexion a échoué : la base locale n’a pas répondu. Vos saisies sont conservées, réessayez.') })
    }
  })

  const oneClick = useAction(async (userId: string, toast?: string) => {
    setErrors({})
    try {
      const user = await loginDemo(userId, remember)
      if (toast) notify(toast, 'info')
      afterLogin(user)
    } catch (error) {
      setErrors({ form: errorMessage(error, 'La connexion au compte de démonstration a échoué. Réessayez.') })
    }
  })

  const guest = useAction(async () => {
    try {
      await enterGuest()
      notify('Mode invité : vos réponses restent sur cet appareil et rien n’est partagé.', 'info')
      afterLogin({ role: 'lyceen', onboarded: true } as PublicUser)
    } catch (error) {
      setErrors({ form: errorMessage(error, 'Le mode invité n’a pas pu démarrer. Réessayez.') })
    }
  })

  const lea = demos?.find((d) => d.role === 'lyceen')
  const busy = submit.pending || oneClick.pending || guest.pending

  return (
    <div className="split-auth">
      <aside className="auth-panel" aria-label="Présentation d’Orient’Avenir">
        <Logo inverse />
        <div className="stack-lg auth-intro">
          <h1 className="display">Trouvez des formations qui vous ressemblent, et comprenez pourquoi.</h1>
          <p>Un questionnaire court, des pistes expliquées critère par critère, un comparateur et un conseiller pour en parler.</p>
          <ul className="list-reset stack auth-features">
            {[
              { icon: Lightbulb, text: 'Chaque piste explique pourquoi elle vous est proposée' },
              { icon: Columns2, text: 'Comparez 2 ou 3 formations côte à côte' },
              { icon: MessageCircle, text: 'Échangez avec un conseiller en visio ou par chat' },
              { icon: CalendarDays, text: 'Ne ratez aucune échéance grâce aux rappels' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="auth-feature">
                <span className="auth-feature-icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="h2 mobile-only">Des formations qui vous ressemblent, expliquées.</p>
        <div className="auth-ethics">
          <ShieldCheck size={20} aria-hidden="true" style={{ flex: 'none' }} />
          <p className="small">Aide à l’exploration, jamais une décision d’admission. Pour candidater, utilisez la plateforme officielle. Données fictives.</p>
        </div>
      </aside>

      <main className="auth-main" id="contenu">
        <div className="card card-lg auth-card stack">
          <div>
            <h2 className="h1">
              <span className="desktop-only">Bon retour !</span>
              <span className="mobile-only">Connexion</span>
            </h2>
            <p className="small muted desktop-only">Connectez-vous pour retrouver vos pistes, vos favoris et vos rendez-vous.</p>
          </div>
          {state?.loggedOut ? <Alert tone="success" title="Vous êtes déconnecté.">Vos données restent enregistrées dans ce navigateur.</Alert> : null}
          {state?.from && !state.loggedOut ? <Alert tone="info">Connectez-vous pour ouvrir la page demandée.</Alert> : null}
          {errors.form ? (
            <Alert tone="error" title="Connexion impossible" role="alert">
              {errors.form}
            </Alert>
          ) : null}
          <form className="stack" onSubmit={(e) => void submit.run(e)} noValidate>
            <Field label="Adresse e-mail" error={errors.email}>
              <input className="input" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Mot de passe" error={errors.password}>
              <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <div className="spread">
              <Checkbox label="Rester connecté" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <Link className="link-button small" to="/mot-de-passe-oublie">
                Mot de passe oublié ?
              </Link>
            </div>
            <Button type="submit" block arrow loading={submit.pending} loadingLabel="Connexion…" disabled={busy}>
              Se connecter
            </Button>
          </form>
          <p className="or-divider">ou</p>
          <Button
            variant="secondary"
            block
            disabled={!lea || busy}
            loading={oneClick.pending}
            onClick={() => lea && void oneClick.run(lea.id, 'Connexion ENT simulée')}
          >
            Se connecter avec l’ENT de mon lycée
          </Button>
          <Button variant="ghost" block arrow onClick={() => void guest.run()} disabled={busy}>
            Explorer sans compte
          </Button>
          <p className="small muted" style={{ textAlign: 'center' }}>
            Sans compte, vos réponses restent sur cet appareil et rien n’est partagé.
          </p>
          <p className="small" style={{ textAlign: 'center' }}>
            Pas encore de compte ?{' '}
            <Link to="/inscription" className="strong">
              Créer un compte
            </Link>
          </p>
        </div>

        <div className="card auth-card cluster" style={{ justifyContent: 'space-between' }}>
          <span className="cluster strong small">
            <Briefcase size={18} aria-hidden="true" /> Vous êtes un professionnel ?
          </span>
          <span className="cluster">
            <Link className="link-button small" to="/inscription?role=conseiller">
              Conseiller
            </Link>
            <Link className="link-button small" to="/inscription?role=etablissement">
              Établissement
            </Link>
          </span>
        </div>
        <p className="small muted auth-card">Prototype : comptes stockés uniquement dans ce navigateur, aucun serveur.</p>

        <section className="auth-wide stack" aria-labelledby="demo-title">
          <h2 id="demo-title" className="h2">
            Comptes de démonstration
          </h2>
          <p className="small muted">Connexion en un clic, ou manuellement avec le mot de passe « demo1234 ».</p>
          {demoError ? <Alert tone="error" title="Comptes de démonstration indisponibles">Rechargez la page pour réessayer.</Alert> : null}
          <div className="stack-sm">
            {(demos ?? []).map((demo) => (
              <article key={demo.id} className="card demo-account">
                <Avatar text={initials(demo.firstName, demo.lastName)} />
                <div className="stack-sm" style={{ gap: 0, minWidth: 0 }}>
                  <h3 className="h3">{demo.role === 'etablissement' ? `${demo.firstName} ${demo.lastName}` : `${demo.firstName} ${demo.lastName.charAt(0)}.`}</h3>
                  <p className="small">
                    {ROLE_LABELS[demo.role]} · <span className="muted">{DEMO_DESCRIPTIONS[demo.role]}</span>
                  </p>
                  <p className="small muted word-break">{demo.email}</p>
                </div>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void oneClick.run(demo.id)}
                  aria-label={`Se connecter en un clic en tant que ${demo.firstName} (${ROLE_LABELS[demo.role].toLowerCase()})`}
                >
                  Se connecter en un clic <ArrowRight size={16} aria-hidden="true" />
                </Button>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
