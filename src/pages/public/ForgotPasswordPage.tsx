import { ArrowLeft } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Field, Logo } from '../../components'
import { authRepo, errorMessage } from '../../db/repositories'
import { useAction } from '../../hooks/useRepo'
import { usePageTitle } from '../../hooks/usePageTitle'

/** Réinitialisation simulée : le message ne révèle pas si le compte existe. */
export const ForgotPasswordPage = () => {
  usePageTitle('Mot de passe oublié')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const submit = useAction(async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      setConfirmation(await authRepo.requestPasswordReset(email))
    } catch (e) {
      setError(errorMessage(e, 'La demande n’a pas pu être traitée. Réessayez.'))
    }
  })
  return (
    <div className="container page">
      <div className="stack-lg" style={{ maxWidth: 480, margin: '0 auto' }}>
        <Logo to="/connexion" />
        <main id="contenu" className="card card-lg stack">
          <h1 className="h1">Mot de passe oublié</h1>
          <p className="muted">Indiquez l’adresse e-mail de votre compte. Prototype : la réinitialisation est simulée, aucun e-mail n’est envoyé.</p>
          {confirmation ? (
            <Alert tone="success" title="Demande enregistrée" role="status">
              {confirmation}
            </Alert>
          ) : (
            <form className="stack" onSubmit={(e) => void submit.run(e)} noValidate>
              <Field label="Adresse e-mail" error={error || undefined} required>
                <input className="input" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Button type="submit" arrow loading={submit.pending} loadingLabel="Envoi…">
                Recevoir un lien de réinitialisation
              </Button>
            </form>
          )}
          <Link to="/connexion" className="link-button">
            <ArrowLeft size={18} aria-hidden="true" /> Retour à la connexion
          </Link>
        </main>
      </div>
    </div>
  )
}
