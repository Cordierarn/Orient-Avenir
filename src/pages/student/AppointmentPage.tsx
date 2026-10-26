import { ArrowRight, Share2, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '../../auth/AuthContext'
import { Alert, Avatar, Button, Checkbox, ErrorState, Field, FieldError, LinkButton, LoadingState, Radio, RadioGroup, Tag, useToast } from '../../components'
import { strongDomains } from '../../data/domains'
import { appointmentRepo, counselorRepo, errorMessage, shareRepo, ValidationError } from '../../db/repositories'
import { useAction, useRepo } from '../../hooks/useRepo'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useOwnProfile } from '../../hooks/useStudent'
import { useToday } from '../../hooks/useToday'
import { formatWeekdayShort, nextMonday, toIsoDay } from '../../lib/dates'
import type { ExchangeFormat, PublicUser } from '../../types'
import { AccountRequiredModal } from '../../layouts/AccountModals'
import { RequestTracking } from './FavoritesPage'

const HOURS = [
  { start: 12, label: '12 h – 13 h' },
  { start: 17, label: '17 h – 18 h' },
  { start: 18, label: '18 h – 19 h' },
]

export const GuestBlocked = ({ feature, title }: { feature: string; title: string }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="container page">
      <div className="card card-lg stack" style={{ maxWidth: 640 }}>
        <h1 className="h1">{title}</h1>
        <Alert tone="warning" title="Un compte est nécessaire">
          {feature} nécessite un compte : un conseiller doit pouvoir vous répondre. En mode invité, rien n’est envoyé.
        </Alert>
        <div>
          <Button arrow onClick={() => setOpen(true)}>
            Se connecter ou créer un compte
          </Button>
        </div>
      </div>
      <AccountRequiredModal open={open} feature={feature} onClose={() => setOpen(false)} />
    </div>
  )
}

export const AppointmentPage = () => {
  usePageTitle('Rendez-vous')
  const user = useCurrentUser()
  if (user.isGuest) return <GuestBlocked feature="La demande de rendez-vous" title="Prendre rendez-vous avec un conseiller" />
  return <AppointmentForm user={user} />
}

const AppointmentForm = ({ user }: { user: PublicUser }) => {
  const { notify } = useToast()
  const today = useToday()
  const counselors = useRepo(() => counselorRepo.listCounselors(), [])
  const latest = useRepo(() => appointmentRepo.getLatestRequest(user.id), [user.id])
  const shares = useRepo(() => shareRepo.getShares(user.id), [user.id])
  const profile = useOwnProfile(user.id)
  const [slots, setSlots] = useState<string[]>([])
  const [format, setFormat] = useState<ExchangeFormat>('visio')
  const [topic, setTopic] = useState('')
  const [preferred, setPreferred] = useState<string>('')
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<{ slots?: string; topic?: string; consent?: string; form?: string }>({})

  const days = useMemo(() => {
    const monday = nextMonday(today)
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d
    })
  }, [today])

  const strong = profile.data ? strongDomains(profile.data.interests).map((d) => d.id) : []
  const sorted = [...(counselors.data ?? [])].sort((a, b) => b.domains.filter((d) => strong.includes(d)).length - a.domains.filter((d) => strong.includes(d)).length)
  const shared = Boolean(shares.data?.conseiller?.active)

  const toggleSlot = (iso: string, checked: boolean) => {
    setErrors((e) => ({ ...e, slots: undefined }))
    setSlots((current) => (checked ? [...current, iso] : current.filter((s) => s !== iso)))
  }

  const submit = useAction(async () => {
    const next: typeof errors = {}
    if (slots.length < appointmentRepo.MIN_SLOTS) next.slots = `Cochez au moins deux créneaux (${slots.length} sélectionné${slots.length > 1 ? 's' : ''}).`
    if (!shared && !consent) next.consent = 'Acceptez le partage de votre dossier : sans lui, le conseiller ne peut pas voir votre demande.'
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    setErrors({})
    try {
      if (!shared) await shareRepo.setShare(user.id, 'conseiller', true)
      await appointmentRepo.createRequest(user.id, { slots, format, preferredCounselorId: preferred || null, topic })
      setSlots([])
      setTopic('')
      notify('Demande envoyée : vous serez informé dès qu’un conseiller choisit un créneau.', 'success')
    } catch (e) {
      if (e instanceof ValidationError) setErrors({ ...(e.fieldErrors as typeof errors), form: e.message })
      else setErrors({ form: errorMessage(e, 'La demande n’a pas pu être envoyée. Vos choix sont conservés : réessayez.') })
    }
  })

  if (latest.loading || counselors.loading) return <div className="container page"><LoadingState label="Chargement…" /></div>
  if (latest.error || counselors.error) return <div className="container page"><ErrorState what="vos rendez-vous" error={latest.error ?? counselors.error} /></div>

  const active = latest.data && (latest.data.request.status === 'en_attente' || latest.data.request.status === 'acceptee') ? latest.data : null

  return (
    <div className="container page">
      <div className="page-header">
        <h1 className="h1">Prendre rendez-vous avec un conseiller</h1>
        <p className="lead">Proposez vos disponibilités. Un conseiller dont le parcours correspond à vos pistes choisit un créneau, en visio ou par chat.</p>
      </div>

      {active ? (
        <div className="layout-aside">
          <section className="card card-lg stack" aria-labelledby="current-request">
            <h2 id="current-request" className="h2">
              {active.request.status === 'acceptee' ? 'Votre rendez-vous est confirmé' : 'Votre demande est en attente'}
            </h2>
            <p className="small muted">
              {active.request.status === 'acceptee'
                ? `${active.counselor?.name} a choisi un de vos créneaux. Préparez l’entretien par écrit dans l’échange.`
                : 'Vous pourrez envoyer une nouvelle demande si celle-ci est annulée ou reste sans réponse.'}
            </p>
            <RequestTracking view={active} sharedAt={shares.data?.conseiller?.active ? shares.data.conseiller.grantedAt : undefined} />
            {active.request.topic ? <p className="surface-2 small">« {active.request.topic} »</p> : null}
            <div className="cluster">
              {active.request.status === 'acceptee' ? (
                <LinkButton to="/echange" arrow>
                  Ouvrir l’échange
                </LinkButton>
              ) : null}
              <LinkButton to="/favoris" variant="secondary">
                Gérer le partage et la demande
              </LinkButton>
            </div>
          </section>
          <aside className="card card-lg stack">
            <h2 className="h2">Ce que voit le conseiller</h2>
            <p className="small muted">Votre profil d’intérêts, vos préférences, vos favoris et vos notes personnelles, comme accepté dans « Favoris ». Jamais vos moyennes.</p>
          </aside>
        </div>
      ) : (
        <div className="layout-aside">
          <section className="card card-lg stack" aria-labelledby="slots-title">
            {latest.data?.request.status === 'refusee' ? (
              <Alert tone="warning" title="Votre précédente demande est restée sans réponse">
                Aucun conseiller n’a pu accepter vos créneaux. Proposez-en d’autres ci-dessous.
              </Alert>
            ) : null}
            {errors.form ? <Alert tone="error" title="Demande non envoyée" role="alert">{errors.form}</Alert> : null}
            <fieldset aria-describedby="slots-help slots-error">
              <legend id="slots-title" className="h2">
                Vos disponibilités
              </legend>
              <p id="slots-help" className="small muted" style={{ margin: '6px 0 12px' }}>
                Cochez au moins deux créneaux. {slots.length} sélectionné{slots.length > 1 ? 's' : ''}.
              </p>
              <div className="slot-grid">
                {days.map((day) => (
                  <div key={day.toISOString()} className="slot-day" role="group" aria-label={formatWeekdayShort(day)}>
                    <p className="small strong">{formatWeekdayShort(day)}</p>
                    {HOURS.map((hour) => {
                      const iso = `${toIsoDay(day)}T${String(hour.start).padStart(2, '0')}:00:00`
                      return (
                        <Checkbox
                          key={iso}
                          label={<span className="small">{hour.label}</span>}
                          checked={slots.includes(iso)}
                          onChange={(e) => toggleSlot(iso, e.target.checked)}
                          aria-label={`${formatWeekdayShort(day)}, ${hour.label}`}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
              <FieldError id="slots-error">{errors.slots}</FieldError>
            </fieldset>
            <RadioGroup
              legend={<span className="h3">Format de l’échange</span>}
              name="format"
              value={format}
              onChange={setFormat}
              options={[
                { value: 'visio', label: 'Visio' },
                { value: 'chat', label: 'Chat écrit' },
                { value: 'indifferent', label: 'Peu importe' },
              ]}
            />
            <Field label="Ce que vous souhaitez aborder (facultatif)" error={errors.topic}>
              <input className="input" value={topic} maxLength={500} onChange={(e) => setTopic(e.target.value)} placeholder="Ex. : je n’arrive pas à choisir entre deux formations." />
            </Field>
            <p className="surface-2 small cluster" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
              <Share2 size={16} aria-hidden="true" className="accent" style={{ flex: 'none', marginTop: 2 }} />
              Le conseiller verra votre profil d’intérêts, vos préférences, vos favoris et vos notes personnelles, comme accepté dans « Favoris ». Jamais vos moyennes.
            </p>
            {!shared ? (
              <div>
                <Checkbox
                  label="J’accepte de partager mon dossier avec le conseiller (révocable à tout moment)"
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked)
                    setErrors((er) => ({ ...er, consent: undefined }))
                  }}
                  aria-describedby="consent-error"
                />
                <FieldError id="consent-error">{errors.consent}</FieldError>
              </div>
            ) : null}
          </section>

          <aside className="card card-lg stack" aria-labelledby="counselors-title">
            <h2 id="counselors-title" className="h2">
              Conseillers proposés
            </h2>
            <p className="small muted">Proposés car leur parcours correspond à vos pistes. Vous pouvez exprimer une préférence.</p>
            <fieldset className="stack-sm">
              <legend className="visually-hidden">Conseiller préféré</legend>
              {sorted.map((c) => (
                <div key={c.id} className={`card card-flat stack-sm ${preferred === c.id ? 'card-selected' : ''}`} style={{ padding: 14 }}>
                  <div className="cluster">
                    <Avatar text={c.initials} />
                    <h3 className="h3">{c.name}</h3>
                  </div>
                  <p className="small muted">{c.title}</p>
                  <div className="cluster">
                    {c.tags.map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                  </div>
                  <p className="small">{c.availability}</p>
                  <Radio name="counselor" label={`Je préfère ${c.name.split(' ')[0]}`} checked={preferred === c.id} onChange={() => setPreferred(c.id)} />
                </div>
              ))}
              <Radio name="counselor" label="Peu importe" checked={preferred === ''} onChange={() => setPreferred('')} />
            </fieldset>
            <p className="surface-2 small cluster" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
              <Users size={16} aria-hidden="true" className="accent" style={{ flex: 'none', marginTop: 2 }} />
              Si le premier échange vous convient, vous gardez le même conseiller jusqu’à la fin de vos démarches.
            </p>
            <Button block arrow loading={submit.pending} loadingLabel="Envoi…" onClick={() => void submit.run()}>
              Envoyer ma demande
            </Button>
            <p className="small muted">
              Démo : connectez-vous ensuite en tant que conseiller pour répondre. <Link to="/favoris">Suivre ma demande</Link> <ArrowRight size={14} aria-hidden="true" />
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}
