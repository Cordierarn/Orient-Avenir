import { Lock, LogIn, UserPlus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { homeFor, ROLE_HOME } from '../auth/routing'
import { readRecentAccounts, type RecentAccount } from '../auth/storage'
import { Alert, Avatar, Button, Field, LinkButton, Modal, ROLE_LABELS, useToast } from '../components'
import { authRepo, demoRepo, errorMessage } from '../db/repositories'
import { useAction, useRepo } from '../hooks/useRepo'
import { initials } from '../lib/text'
import type { Role } from '../types'

/** « Changer d'espace » : ouvert quand on choisit un autre rôle dans l'en-tête. */
export const SwitchSpaceModal = ({ role, onClose }: { role: Role | null; onClose: () => void }) => {
  const { loginDemo, logout } = useAuth()
  const navigate = useNavigate()
  const { notify } = useToast()
  const { data: demo } = useRepo(() => (role ? authRepo.getDemoAccountForRole(role) : Promise.resolve(null)), [role])
  const [error, setError] = useState('')
  const { run, pending } = useAction(async () => {
    if (!demo) return
    try {
      const account = await loginDemo(demo.id)
      onClose()
      notify(`Connecté en tant que ${account.firstName} (${ROLE_LABELS[account.role].toLowerCase()}).`, 'success')
      navigate(homeFor(account))
    } catch (e) {
      setError(errorMessage(e, 'La connexion au compte de démonstration a échoué. Réessayez.'))
    }
  })
  if (!role) return null
  const label = ROLE_LABELS[role]
  return (
    <Modal
      open
      title="Changer d’espace"
      description={`L’espace ${label} nécessite un compte ${label.toLowerCase()}. Vos données actuelles restent enregistrées dans ce navigateur.`}
      onClose={onClose}
    >
      <div className="stack">
        {error ? <Alert tone="error" title="Connexion impossible" role="alert">{error}</Alert> : null}
        {demo ? (
          <Button block arrow loading={pending} loadingLabel="Connexion…" onClick={() => void run()} data-autofocus>
            Se connecter avec {demo.role === 'etablissement' ? `${demo.firstName} ${demo.lastName}` : `${demo.firstName} ${demo.lastName.charAt(0)}.`} (démo)
          </Button>
        ) : null}
        <Button
          variant="secondary"
          block
          onClick={async () => {
            await logout()
            onClose()
            navigate('/connexion', { state: { from: ROLE_HOME[role] } })
          }}
        >
          Se connecter avec un autre compte
        </Button>
        <Button variant="ghost" block onClick={onClose}>
          Annuler
        </Button>
      </div>
    </Modal>
  )
}

/** « Changer de compte » : comptes récemment utilisés sur cet appareil. */
export const SwitchAccountModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { user, loginDemo, login } = useAuth()
  const navigate = useNavigate()
  const { notify } = useToast()
  const [recent, setRecent] = useState<RecentAccount[]>([])
  const [selected, setSelected] = useState<RecentAccount | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { data: demos } = useRepo(() => authRepo.listDemoAccounts(), [])

  useEffect(() => {
    if (!open) return
    setRecent(readRecentAccounts())
    setSelected(null)
    setPassword('')
    setError('')
  }, [open])

  const accounts: RecentAccount[] = [
    ...recent,
    ...(demos ?? [])
      .filter((d) => !recent.some((r) => r.userId === d.id))
      .map((d) => ({
        userId: d.id,
        name: d.role === 'etablissement' ? `${d.firstName} ${d.lastName}` : `${d.firstName} ${d.lastName.charAt(0)}.`,
        email: d.email,
        role: d.role,
        isDemo: true,
        lastUsedAt: '',
      })),
  ].filter((a) => a.userId !== user?.id)

  const done = (name: string, next: Parameters<typeof homeFor>[0]) => {
    onClose()
    notify(`Vous êtes maintenant connecté en tant que ${name}.`, 'success')
    navigate(homeFor(next))
  }

  const { run, pending } = useAction(async (account: RecentAccount) => {
    setError('')
    try {
      if (account.isDemo) done(account.name, await loginDemo(account.userId))
      else setSelected(account)
    } catch (e) {
      setError(errorMessage(e, 'Le changement de compte a échoué. Réessayez.'))
    }
  })

  const submitPassword = useAction(async (event: FormEvent) => {
    event.preventDefault()
    if (!selected) return
    setError('')
    try {
      done(selected.name, await login(selected.email, password, false))
    } catch (e) {
      setError(errorMessage(e, 'Connexion impossible. Vérifiez votre mot de passe.'))
    }
  })

  return (
    <Modal open={open} title="Changer de compte" description="Comptes utilisés récemment sur cet appareil. Les données de chaque compte restent séparées." onClose={onClose}>
      {selected ? (
        <form className="stack" onSubmit={(e) => void submitPassword.run(e)} noValidate>
          <p>
            Saisissez le mot de passe de <strong>{selected.name}</strong> ({selected.email}).
          </p>
          <Field label="Mot de passe" error={error || undefined} required>
            <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} data-autofocus />
          </Field>
          <div className="cluster">
            <Button type="submit" arrow loading={submitPassword.pending} loadingLabel="Connexion…">
              Se connecter
            </Button>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Retour à la liste
            </Button>
          </div>
        </form>
      ) : (
        <div className="stack">
          {error ? <Alert tone="error" role="alert" title="Changement impossible">{error}</Alert> : null}
          {accounts.length ? (
            <ul className="list-reset stack-sm">
              {accounts.map((account) => (
                <li key={account.userId}>
                  <button type="button" className="list-item-button" onClick={() => void run(account)} disabled={pending}>
                    <span className="cluster" style={{ gap: 12 }}>
                      <Avatar text={initials(account.name.split(' ')[0], account.name.split(' ')[1] ?? '')} />
                      <span className="stack-sm" style={{ gap: 0 }}>
                        <strong>{account.name}</strong>
                        <span className="small muted">
                          {ROLE_LABELS[account.role]} · {account.email}
                          {account.isDemo ? ' · démo, bascule directe' : ' · mot de passe demandé'}
                        </span>
                      </span>
                      {account.isDemo ? null : <Lock size={16} aria-hidden="true" style={{ marginLeft: 'auto' }} />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Aucun autre compte n’a été utilisé sur cet appareil.</p>
          )}
          <div className="cluster">
            <LinkButton to="/connexion" variant="secondary" icon={<LogIn size={18} aria-hidden="true" />} onClick={onClose} state={{ switchAccount: true }}>
              Autre compte
            </LinkButton>
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

/** Réinitialisation des données de démonstration, avec confirmation. */
export const ResetDemoModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { user } = useAuth()
  const { notify } = useToast()
  const [error, setError] = useState('')
  const { run, pending } = useAction(async () => {
    if (!user) return
    setError('')
    try {
      await demoRepo.resetDemoData(user.id)
      onClose()
      notify('Données de démonstration réinitialisées : comptes, formations et échanges de démo sont revenus à leur état initial.', 'success')
    } catch (e) {
      setError(errorMessage(e, 'La réinitialisation a échoué : aucune donnée n’a été modifiée. Réessayez.'))
    }
  })
  return (
    <Modal
      open={open}
      title="Réinitialiser les données de démo ?"
      description="Les comptes de démonstration (Léa, Gabriel, Alain), leurs formations, favoris, rendez-vous et messages reviennent à leur état initial. Les comptes que vous avez créés sont conservés."
      onClose={onClose}
    >
      <div className="stack">
        {error ? <Alert tone="error" role="alert" title="Réinitialisation impossible">{error}</Alert> : null}
        <div className="cluster">
          <Button variant="danger" loading={pending} loadingLabel="Réinitialisation…" onClick={() => void run()}>
            Réinitialiser
          </Button>
          <Button variant="secondary" onClick={onClose} data-autofocus>
            Annuler
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/** Action réservée aux comptes, tentée en mode invité : aucune réussite simulée. */
export const AccountRequiredModal = ({ open, feature, onClose }: { open: boolean; feature: string; onClose: () => void }) => {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const go = async (to: string) => {
    await logout()
    onClose()
    navigate(to, { state: { from: location.pathname } })
  }
  return (
    <Modal
      open={open}
      title="Un compte est nécessaire"
      description={`${feature} nécessite un compte. En mode invité, vos réponses restent uniquement sur cet appareil et rien n’est partagé.`}
      onClose={onClose}
    >
      <div className="stack">
        <Button arrow icon={<LogIn size={18} aria-hidden="true" />} onClick={() => void go('/connexion')} data-autofocus>
          Se connecter
        </Button>
        <Button variant="secondary" icon={<UserPlus size={18} aria-hidden="true" />} onClick={() => void go('/inscription')}>
          Créer un compte
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Continuer en invité
        </Button>
      </div>
    </Modal>
  )
}
