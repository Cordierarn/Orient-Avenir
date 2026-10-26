import { ArrowRight, ChevronDown, Info } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCurrentUser } from '../../auth/AuthContext'
import { Alert, Button, Checkbox, EmptyState, ErrorState, Field, LoadingState, Modal, Status, Tag, useToast } from '../../components'
import { domainChipLabels, domains, specialites as allSpecialites } from '../../data/domains'
import { errorMessage, formationRepo, institutionRepo, ValidationError } from '../../db/repositories'
import { FIELD_ORDER, validateForPublication, type EditableField, type FormationDraft } from '../../db/repositories/formationRepository'
import { useAction, useRepo } from '../../hooks/useRepo'
import { usePageTitle } from '../../hooks/usePageTitle'
import { formatDate } from '../../lib/dates'
import type { DomainId, Formation, FormationType, Institution } from '../../types'
import { InterestStatsTable } from './InterestStatsTable'

const LABELS: Record<EditableField, string> = {
  title: 'Intitulé',
  typeLong: 'Type de diplôme',
  durationLabel: 'Durée et rythme',
  summary: 'Description',
  outcomes: 'Débouchés',
  vigilance: 'Point de vigilance',
}

const FIELD_NAMES: Record<EditableField, string> = {
  title: 'l’intitulé',
  typeLong: 'le type de diplôme',
  durationLabel: 'la durée',
  summary: 'la description',
  outcomes: 'débouchés',
  vigilance: 'point de vigilance',
}

const TYPES: FormationType[] = ['BUT', 'BTS', 'Licence', 'École d’ingénieurs', 'Bachelor', 'CPGE', 'Formation en soins infirmiers']

const EXAMPLE = {
  outcomes: 'Ingénieur en numérique, énergie ou industrie. 92 % en emploi six mois après le diplôme (chiffre fictif).',
  vigilance: 'Rythme soutenu en mathématiques et physique. Frais de 2 500 € par an (fictifs), bourses possibles.',
}

const toDraft = (f: Formation): FormationDraft => ({
  title: f.title,
  typeLong: f.typeLong,
  durationLabel: f.durationLabel,
  summary: f.summary,
  outcomes: f.outcomes,
  vigilance: f.vigilance,
  typeShort: f.typeShort,
  durationYears: f.durationYears,
  places: f.places,
  alternance: f.alternance,
  tags: f.tags,
  specialites: f.specialites,
  keywords: f.keywords,
})

const isIncomplete = (f: Formation) => Object.keys(validateForPublication(toDraft(f))).length > 0

const listStatus = (f: Formation) =>
  f.status === 'publiee' ? <Status tone="success">Publiée</Status> : isIncomplete(f) ? <Status tone="warning">Incomplète</Status> : <Status>Brouillon</Status>

/** Sentence d'erreur : « Débouchés et point de vigilance sont obligatoires… ». */
const missingSentence = (fields: EditableField[]) => {
  const names = fields.map((f) => FIELD_NAMES[f])
  const joined = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} et ${names.at(-1)}`
  const text = `${joined.charAt(0).toUpperCase()}${joined.slice(1)} ${fields.length > 1 ? 'sont obligatoires' : 'est obligatoire'} pour informer les lycéens. Vos autres saisies sont conservées.`
  return text
}

const Editor = ({ userId, formation, institution }: { userId: string; formation: Formation; institution: Institution }) => {
  const { notify } = useToast()
  const [draft, setDraft] = useState<FormationDraft>(() => toDraft(formation))
  const [errors, setErrors] = useState<Partial<Record<EditableField, string>>>({})
  const [banner, setBanner] = useState<{ tone: 'error' | 'success' | 'info'; title: string; text: string } | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [confirmDraft, setConfirmDraft] = useState(false)
  const [keywordsText, setKeywordsText] = useState(formation.keywords.join(', '))

  const set = <K extends keyof FormationDraft>(key: K, value: FormationDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
    if (key in errors) setErrors((current) => ({ ...current, [key]: undefined }))
  }
  const payload = (): FormationDraft => ({ ...draft, keywords: keywordsText.split(',').map((k) => k.trim()).filter(Boolean) })

  const publish = useAction(async () => {
    setBanner(null)
    try {
      const updated = await formationRepo.publish(userId, formation.id, payload())
      setErrors({})
      setBanner({
        tone: 'success',
        title: formation.status === 'publiee' ? 'Fiche mise à jour' : 'Fiche publiée',
        text: `Elle est visible côté lycéen dans les pistes et le comparateur, avec la date du ${formatDate(updated.updatedAt)}.`,
      })
      notify(`« ${updated.title} » est publiée et visible côté lycéen.`, 'success')
    } catch (e) {
      if (e instanceof ValidationError) {
        const fieldErrors = e.fieldErrors as Partial<Record<EditableField, string>>
        setErrors(fieldErrors)
        setBanner({ tone: 'error', title: e.message, text: missingSentence(FIELD_ORDER.filter((f) => fieldErrors[f])) })
      } else setBanner({ tone: 'error', title: 'Publication impossible', text: errorMessage(e, 'La fiche n’a pas pu être publiée. Vos saisies sont conservées : réessayez.') })
    }
  })

  const saveDraft = useAction(async () => {
    setBanner(null)
    setConfirmDraft(false)
    try {
      await formationRepo.saveDraft(userId, formation.id, payload())
      setBanner({ tone: 'info', title: 'Brouillon enregistré', text: 'La fiche n’est pas visible des lycéens tant qu’elle n’est pas publiée.' })
    } catch (e) {
      setBanner({ tone: 'error', title: 'Brouillon non enregistré', text: errorMessage(e, 'Le brouillon n’a pas pu être enregistré. Réessayez.') })
    }
  })

  const hasErrors = Object.values(errors).some(Boolean)
  const filled = (v: string) => Boolean(v.trim())
  const statusBadge =
    formation.status === 'publiee' ? (
      <Status tone="success">Publiée le {formatDate(formation.publishedAt ?? formation.updatedAt)}</Status>
    ) : isIncomplete(formation) ? (
      <Status tone="warning">Brouillon incomplet</Status>
    ) : (
      <Status>Brouillon</Status>
    )

  const field = (key: EditableField, multiline: boolean) => (
    <Field key={key} label={LABELS[key]} error={errors[key]}>
      {multiline ? (
        <textarea className="textarea" rows={key === 'summary' ? 3 : 2} placeholder="À compléter avant publication" value={draft[key]} onChange={(e) => set(key, e.target.value)} />
      ) : (
        <input className="input" placeholder="À compléter avant publication" value={draft[key]} onChange={(e) => set(key, e.target.value)} />
      )}
    </Field>
  )

  return (
    <section className="card card-lg stack" aria-labelledby="editor-title">
      {banner ? (
        <Alert tone={banner.tone} title={banner.title} role={banner.tone === 'error' ? 'alert' : 'status'}>
          {banner.text}
        </Alert>
      ) : null}
      <div className="spread" style={{ alignItems: 'flex-start' }}>
        <div>
          <p className="overline accent">{draft.typeLong || 'Type de diplôme à préciser'}</p>
          <h2 id="editor-title" className="h1">
            {draft.title || 'Nouvelle fiche'}
          </h2>
        </div>
        {statusBadge}
      </div>
      <div className="editor-grid">
        <div className="stack">
          {field('title', false)}
          {field('typeLong', false)}
          {field('durationLabel', true)}
          {field('summary', true)}
          {field('outcomes', true)}
          {field('vigilance', true)}
          <div className="card card-flat stack-sm">
            <button type="button" className="link-button" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}>
              <ChevronDown size={18} aria-hidden="true" style={{ transform: moreOpen ? 'rotate(180deg)' : undefined }} /> Autres informations (pistes et découverte)
            </button>
            {moreOpen ? (
              <div className="stack">
                <div className="grid-3">
                  <Field label="Catégorie">
                    <select className="select" value={draft.typeShort} onChange={(e) => set('typeShort', e.target.value as FormationType)}>
                      {TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Durée (années)">
                    <input className="input" type="number" min={1} max={8} value={draft.durationYears} onChange={(e) => set('durationYears', Number(e.target.value))} />
                  </Field>
                  <Field label="Places">
                    <input className="input" type="number" min={1} max={2000} value={draft.places} onChange={(e) => set('places', Number(e.target.value))} />
                  </Field>
                </div>
                <Checkbox label="Alternance possible" checked={Boolean(draft.alternance)} onChange={(e) => set('alternance', e.target.checked)} />
                <fieldset>
                  <legend className="field-label">Domaines (le premier coché est le domaine principal)</legend>
                  <div className="grid-3" style={{ gap: 0 }}>
                    {domains.map((d) => (
                      <Checkbox
                        key={d.id}
                        label={d.label}
                        checked={draft.tags?.includes(d.id) ?? false}
                        onChange={(e) => set('tags', e.target.checked ? [...(draft.tags ?? []), d.id] : (draft.tags ?? []).filter((t: DomainId) => t !== d.id))}
                      />
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="field-label">Spécialités conseillées</legend>
                  <div className="cluster" style={{ columnGap: 16, rowGap: 0 }}>
                    {allSpecialites.map((s) => (
                      <Checkbox
                        key={s}
                        label={s}
                        checked={draft.specialites?.includes(s) ?? false}
                        onChange={(e) => set('specialites', e.target.checked ? [...(draft.specialites ?? []), s] : (draft.specialites ?? []).filter((x) => x !== s))}
                      />
                    ))}
                  </div>
                </fieldset>
                <Field label="Mots-clés (séparés par des virgules)">
                  <input className="input" value={keywordsText} onChange={(e) => setKeywordsText(e.target.value)} />
                </Field>
              </div>
            ) : null}
          </div>
        </div>
        <aside className="preview-card stack-sm" aria-label="Aperçu côté lycéen" style={{ alignSelf: 'start' }}>
          <p className="overline muted">Aperçu côté lycéen</p>
          <div className="card stack-sm" style={{ padding: 14 }}>
            <p className="overline accent">{draft.title || 'Intitulé'}</p>
            <p className="h3">{draft.title || 'Intitulé à compléter'}</p>
            <p className="small muted">
              {institution.city} · {institution.citySize === 'grande' ? 'grande ville' : institution.citySize === 'moyenne' ? 'ville moyenne' : 'petite ville'} ·{' '}
              {draft.durationYears} ans
            </p>
            {draft.tags?.[0] ? (
              <div>
                <Tag>{domainChipLabels[draft.tags[0]]}</Tag>
              </div>
            ) : null}
            <dl className="small stack-sm" style={{ margin: 0 }}>
              <div className="spread">
                <dt>Débouchés</dt>
                <dd style={{ margin: 0 }} className={filled(draft.outcomes) ? 'text-ok' : 'text-bad'}>
                  {filled(draft.outcomes) ? 'Renseigné' : 'Non renseigné'}
                </dd>
              </div>
              <div className="spread">
                <dt>Vigilance</dt>
                <dd style={{ margin: 0 }} className={filled(draft.vigilance) ? 'text-ok' : 'text-bad'}>
                  {filled(draft.vigilance) ? 'Renseigné' : 'Non renseigné'}
                </dd>
              </div>
            </dl>
          </div>
          <p className="small muted">
            {filled(draft.outcomes) && filled(draft.vigilance) ? 'Aperçu identique à ce que voient les lycéens.' : 'Les rubriques vides apparaîtraient « Non renseigné » aux lycéens.'}
          </p>
        </aside>
      </div>
      <p className="surface-info small cluster" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
        <Info size={16} aria-hidden="true" className="accent" style={{ flex: 'none', marginTop: 2 }} />
        Une fiche n’est publiée que si toutes les rubriques sont remplies : les lycéens ont besoin des débouchés et des points de vigilance pour comparer honnêtement.
      </p>
      <div className="cluster">
        <Button loading={publish.pending} loadingLabel="Publication…" onClick={() => void publish.run()}>
          {formation.status === 'publiee' ? 'Mettre à jour la fiche' : 'Publier la fiche'}
        </Button>
        <Button variant="secondary" loading={saveDraft.pending} onClick={() => (formation.status === 'publiee' ? setConfirmDraft(true) : void saveDraft.run())}>
          Enregistrer le brouillon
        </Button>
        {hasErrors ? (
          <Button
            variant="ghost"
            arrow
            onClick={() => {
              setDraft((d) => ({ ...d, outcomes: d.outcomes.trim() || EXAMPLE.outcomes, vigilance: d.vigilance.trim() || EXAMPLE.vigilance }))
              setErrors((e) => ({ ...e, outcomes: undefined, vigilance: undefined }))
            }}
          >
            Remplir avec un exemple (démo)
          </Button>
        ) : null}
      </div>
      <Modal
        open={confirmDraft}
        title="Repasser la fiche en brouillon ?"
        description="La fiche ne sera plus visible des lycéens (pistes, découverte, comparateur) tant que vous ne la republiez pas."
        onClose={() => setConfirmDraft(false)}
        footer={
          <>
            <Button variant="danger" onClick={() => void saveDraft.run()}>
              Repasser en brouillon
            </Button>
            <Button variant="secondary" onClick={() => setConfirmDraft(false)} data-autofocus>
              Annuler
            </Button>
          </>
        }
      />
    </section>
  )
}

export const FichesPage = () => {
  usePageTitle('Mes fiches formation')
  const user = useCurrentUser()
  const { notify } = useToast()
  const [params, setParams] = useSearchParams()
  const formations = useRepo(() => formationRepo.listForInstitution(user.id), [user.id])
  const institution = useRepo(() => institutionRepo.getOwnInstitution(user.id), [user.id])
  const [createOpen, setCreateOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [createError, setCreateError] = useState('')
  const selectedId = params.get('fiche') ?? formations.data?.[0]?.id

  // La fiche affichée est fixée dans l'adresse : publier (et donc réordonner la liste) ne change pas de fiche.
  const firstId = formations.data?.[0]?.id
  useEffect(() => {
    if (!params.get('fiche') && firstId) setParams({ fiche: firstId }, { replace: true })
  }, [params, firstId, setParams])

  useEffect(() => {
    if (!createOpen) {
      setNewTitle('')
      setCreateError('')
    }
  }, [createOpen])

  const create = useAction(async (event: FormEvent) => {
    event.preventDefault()
    setCreateError('')
    try {
      const created = await formationRepo.createFormation(user.id, newTitle)
      setCreateOpen(false)
      setParams({ fiche: created.id })
      notify(`Fiche « ${created.title} » créée en brouillon.`, 'success')
    } catch (e) {
      setCreateError(errorMessage(e, 'La fiche n’a pas pu être créée. Réessayez.'))
    }
  })

  if (formations.loading || institution.loading) return <div className="container page"><LoadingState label="Chargement de vos fiches…" /></div>
  if (formations.error || institution.error || !formations.data || !institution.data)
    return <div className="container page"><ErrorState what="vos fiches" error={formations.error ?? institution.error} /></div>

  const selected = formations.data.find((f) => f.id === selectedId)
  const school = institution.data

  return (
    <div className="container page stack-lg">
      <div>
        <h1 className="h1">Mes fiches formation</h1>
        <p className="lead">
          {school.shortName} ({school.kind.toLowerCase()} fictive) · {formations.data.length} parcours d’admission. Les lycéens voient la date de dernière mise à jour.
        </p>
      </div>
      <div className="layout-sidebar">
        <aside className="card stack-sm" aria-labelledby="formations-list">
          <h2 id="formations-list" className="overline muted">
            Vos formations
          </h2>
          {formations.data.length ? (
            <ul className="list-reset stack-sm">
              {formations.data.map((f) => (
                <li key={f.id}>
                  <button type="button" className="list-item-button stack-sm" aria-current={f.id === selectedId ? 'true' : undefined} onClick={() => setParams({ fiche: f.id })} style={{ display: 'flex', gap: 6 }}>
                    <span className="strong">{f.title}</span>
                    <span>{listStatus(f)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="small muted">Aucune fiche pour le moment.</p>
          )}
          <button type="button" className="link-button" onClick={() => setCreateOpen(true)}>
            Créer une fiche <ArrowRight size={16} aria-hidden="true" />
          </button>
        </aside>
        {selected ? (
          <Editor key={selected.id} userId={user.id} formation={selected} institution={school} />
        ) : (
          <div className="card">
            <EmptyState title="Aucune fiche sélectionnée" action={<Button onClick={() => setCreateOpen(true)}>Créer une fiche</Button>}>
              Créez votre première fiche formation : elle restera en brouillon jusqu’à sa publication.
            </EmptyState>
          </div>
        )}
      </div>
      <InterestStatsTable userId={user.id} />
      <Modal open={createOpen} title="Créer une fiche" description="La fiche est créée en brouillon : elle n’est visible des lycéens qu’après publication." onClose={() => setCreateOpen(false)}>
        <form className="stack" onSubmit={(e) => void create.run(e)} noValidate>
          <Field label="Intitulé de la formation" required error={createError || undefined}>
            <input className="input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          </Field>
          <div className="cluster">
            <Button type="submit" loading={create.pending}>
              Créer le brouillon
            </Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
