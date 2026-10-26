import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../../auth/AuthContext'
import { Alert, Button, Checkbox, ErrorState, Field, FieldError, LoadingState, useToast } from '../../components'
import { domains } from '../../data/domains'
import { counselorRepo, errorMessage, ValidationError } from '../../db/repositories'
import type { CounselorProfileInput } from '../../db/repositories/counselorRepository'
import { useAction, useRepo } from '../../hooks/useRepo'
import { usePageTitle } from '../../hooks/usePageTitle'
import type { DomainId } from '../../types'

/** Profil du conseiller : premier parcours après inscription, puis « Modifier mon profil ». */
export const CounselorProfilePage = () => {
  usePageTitle('Mon profil de conseiller')
  const user = useCurrentUser()
  const navigate = useNavigate()
  const { notify } = useToast()
  const existing = useRepo(() => counselorRepo.getOwnCounselorProfile(user.id), [user.id])
  const [input, setInput] = useState<CounselorProfileInput>({ title: '', domains: [], tags: [], availability: '', formats: ['visio'] })
  const [tagsText, setTagsText] = useState('')
  const [errors, setErrors] = useState<Partial<Record<keyof CounselorProfileInput, string>>>({})
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!existing.data) return
    setInput({ title: existing.data.title, domains: existing.data.domains, tags: existing.data.tags, availability: existing.data.availability, formats: existing.data.formats })
    setTagsText(existing.data.tags.join(', '))
  }, [existing.data])

  const submit = useAction(async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    const payload = { ...input, tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean) }
    try {
      await counselorRepo.saveCounselorProfile(user.id, payload)
      notify('Profil enregistré : les lycéens peuvent maintenant vous choisir.', 'success')
      navigate('/conseiller/demandes')
    } catch (e) {
      if (e instanceof ValidationError) {
        setErrors(e.fieldErrors)
        setFormError('Votre profil est incomplet : complétez les champs signalés. Vos saisies sont conservées.')
      } else setFormError(errorMessage(e, 'Le profil n’a pas pu être enregistré. Réessayez.'))
    }
  })

  if (existing.loading) return <div className="container page"><LoadingState /></div>
  if (existing.error) return <div className="container page"><ErrorState what="votre profil" error={existing.error} /></div>

  const toggleDomain = (id: DomainId, checked: boolean) => {
    setErrors((e) => ({ ...e, domains: undefined }))
    setInput((current) => ({ ...current, domains: checked ? [...current.domains, id] : current.domains.filter((d) => d !== id) }))
  }
  const toggleFormat = (format: 'visio' | 'chat', checked: boolean) => {
    setErrors((e) => ({ ...e, formats: undefined }))
    setInput((current) => ({ ...current, formats: checked ? [...current.formats, format] : current.formats.filter((f) => f !== format) }))
  }

  return (
    <div className="container page">
      <div className="card card-lg stack" style={{ maxWidth: 760 }}>
        <div>
          <h1 className="h1">{user.onboarded ? 'Modifier mon profil' : 'Bienvenue ! Présentez votre accompagnement'}</h1>
          <p className="lead">Ces informations aident les lycéens à choisir un conseiller dont le parcours correspond à leurs pistes.</p>
        </div>
        {formError ? <Alert tone="error" title="Profil non enregistré" role="alert">{formError}</Alert> : null}
        <form className="stack" onSubmit={(e) => void submit.run(e)} noValidate>
          <Field label="Votre parcours en une phrase" required error={errors.title} help="Exemple : Conseiller d’orientation indépendant, ancien étudiant en informatique">
            <input className="input" value={input.title} onChange={(e) => setInput({ ...input, title: e.target.value })} />
          </Field>
          <fieldset className="fieldset-card" aria-describedby="domains-error">
            <legend>Domaines accompagnés</legend>
            <div className="grid-3" style={{ gap: 0 }}>
              {domains.map((d) => (
                <Checkbox key={d.id} label={d.label} checked={input.domains.includes(d.id)} onChange={(e) => toggleDomain(d.id, e.target.checked)} />
              ))}
            </div>
            <FieldError id="domains-error">{errors.domains}</FieldError>
          </fieldset>
          <Field label="Spécialités affichées (séparées par des virgules)" help="Exemple : Numérique, Écoles d’ingénieurs">
            <input className="input" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
          </Field>
          <Field label="Disponibilités habituelles" required error={errors.availability} help="Exemple : Disponible en soirée · visio ou chat">
            <input className="input" value={input.availability} onChange={(e) => setInput({ ...input, availability: e.target.value })} />
          </Field>
          <fieldset className="fieldset-card" aria-describedby="formats-error">
            <legend>Formats d’échange</legend>
            <div className="cluster" style={{ columnGap: 20 }}>
              <Checkbox label="Visio" checked={input.formats.includes('visio')} onChange={(e) => toggleFormat('visio', e.target.checked)} />
              <Checkbox label="Chat écrit" checked={input.formats.includes('chat')} onChange={(e) => toggleFormat('chat', e.target.checked)} />
            </div>
            <FieldError id="formats-error">{errors.formats}</FieldError>
          </fieldset>
          <div className="cluster">
            <Button type="submit" arrow loading={submit.pending} loadingLabel="Enregistrement…">
              Enregistrer mon profil
            </Button>
            {user.onboarded ? (
              <Button variant="secondary" onClick={() => navigate('/conseiller/demandes')}>
                Annuler
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  )
}
