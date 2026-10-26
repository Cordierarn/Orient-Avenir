import { Clock, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useCurrentUser } from '../../auth/AuthContext'
import { Alert, Button, Checkbox, ErrorState, IconButton, IconChip, LoadingState, Status, useToast, type StatusTone } from '../../components'
import { deadlineRepo, errorMessage } from '../../db/repositories'
import { useRepo } from '../../hooks/useRepo'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useToday } from '../../hooks/useToday'
import { daysBetween, formatDate, formatLongDate, formatShortDate, fromIsoDay, toIsoDay } from '../../lib/dates'
import { deadlinesToIcs, downloadFile } from '../../lib/ics'
import type { Deadline, DeadlineBadge, ReminderSettings } from '../../types'

const BADGES: Record<DeadlineBadge, { label: string; tone: StatusTone }> = {
  officiel: { label: 'Officiel', tone: 'info' },
  favori: { label: 'Favori', tone: 'neutral' },
  important: { label: 'Important', tone: 'warning' },
  'delai-court': { label: 'Délai court', tone: 'warning' },
  urgent: { label: 'À ne pas oublier', tone: 'error' },
  invitation: { label: 'Invitation', tone: 'info' },
}

const dateLabel = (d: Deadline) => {
  if (!d.endDate) return formatShortDate(d.date)
  const start = fromIsoDay(d.date)
  const end = fromIsoDay(d.endDate)
  return start.getMonth() === end.getMonth() ? `${start.getDate()} au ${formatShortDate(end)}` : `${formatShortDate(start)} au ${formatShortDate(end)}`
}

export const DeadlinesPage = () => {
  usePageTitle('Mes échéances')
  const user = useCurrentUser()
  const { notify } = useToast()
  const today = useToday()
  const deadlines = useRepo(() => deadlineRepo.listDeadlines(user.id), [user.id])
  const reminders = useRepo(() => deadlineRepo.getReminders(user.id), [user.id])
  const [simulated, setSimulated] = useState('')
  const [dateError, setDateError] = useState('')

  useEffect(() => setSimulated(reminders.data?.simulatedToday ?? ''), [reminders.data?.simulatedToday])

  if (deadlines.loading || reminders.loading) return <div className="container page"><LoadingState label="Chargement de vos échéances…" /></div>
  if (deadlines.error || reminders.error || !deadlines.data || !reminders.data) return <div className="container page"><ErrorState what="vos échéances" error={deadlines.error ?? reminders.error} /></div>

  const list = deadlines.data
  const settings = reminders.data
  const todayIso = toIsoDay(today)
  const upcoming = list.filter((d) => (d.endDate ?? d.date) >= todayIso)
  const next = upcoming[0]
  const due = deadlineRepo.computeDueReminders(list, settings, today)
  const example = due[0] ?? (next ? { deadline: next, daysLeft: daysBetween(today, fromIsoDay(next.date)) } : null)

  const update = async (patch: Partial<Omit<ReminderSettings, 'userId'>>, message: string) => {
    try {
      await deadlineRepo.saveReminders(user.id, patch)
      notify(message, 'success')
    } catch (e) {
      notify(errorMessage(e, 'Le réglage n’a pas pu être enregistré. Réessayez.'), 'error')
    }
  }

  const applyDate = async () => {
    setDateError('')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(simulated)) {
      setDateError('Choisissez une date complète (jour, mois et année).')
      return
    }
    await update({ simulatedToday: simulated }, `Date du jour simulée : ${formatDate(fromIsoDay(simulated))}. Les rappels sont recalculés.`)
  }

  const remove = async (deadline: Deadline) => {
    try {
      await deadlineRepo.removeDeadline(user.id, deadline.id)
      notify(`« ${deadline.title} » retirée de vos échéances.`, 'success')
    } catch (e) {
      notify(errorMessage(e, 'L’échéance n’a pas pu être retirée. Réessayez.'), 'error')
    }
  }

  return (
    <div className="container page stack">
      <div>
        <h1 className="h1">Mes échéances</h1>
        <p className="lead">
          Les dates officielles viennent du calendrier de la plateforme nationale de candidature (dates fictives 2027). Orient’Avenir vous rappelle les étapes, mais les
          démarches se font sur la plateforme officielle.
        </p>
      </div>
      {next ? (
        <Alert tone="info" title={`Prochaine échéance ${daysBetween(today, fromIsoDay(next.date)) === 0 ? 'aujourd’hui' : `dans ${daysBetween(today, fromIsoDay(next.date))} jours`}`}>
          {next.title}, {formatLongDate(next.date)}. {next.subtitle}.
        </Alert>
      ) : (
        <Alert tone="info" title="Aucune échéance à venir">
          Toutes les dates de ce calendrier sont passées à la date du jour choisie.
        </Alert>
      )}
      <div className="layout-aside">
        <section className="card card-lg" aria-labelledby="calendar-title">
          <h2 id="calendar-title" className="h2" style={{ marginBottom: 8 }}>
            Calendrier 2027
          </h2>
          <ul className="list-reset">
            {list.map((d) => {
              const past = (d.endDate ?? d.date) < todayIso
              const badge = BADGES[d.badge]
              return (
                <li key={d.id} className="deadline-row" style={past ? { opacity: 0.6 } : undefined}>
                  <span className={`date-chip ${d.badge === 'urgent' ? 'date-chip-urgent' : ''}`}>{dateLabel(d)}</span>
                  <span>
                    <span className="strong">{d.title}</span>
                    <br />
                    <span className="small muted">
                      {d.subtitle}
                      {past ? ' · passée' : ''}
                    </span>
                  </span>
                  <span className="cluster">
                    <Status tone={badge.tone}>{badge.label}</Status>
                    {d.ownerId ? <IconButton variant="ghost" label={`Retirer « ${d.title} »`} icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => void remove(d)} /> : null}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
        <aside className="stack">
          <section className="card card-lg stack" aria-labelledby="reminders-title">
            <IconChip>
              <Clock size={20} />
            </IconChip>
            <h2 id="reminders-title" className="h2">
              Mes rappels
            </h2>
            <p className="small muted">Vous choisissez quand être prévenu. Aucune autre sollicitation.</p>
            <div className="stack-sm" style={{ gap: 0 }}>
              <Checkbox label="7 jours avant" checked={settings.sevenDays} onChange={(e) => void update({ sevenDays: e.target.checked }, e.target.checked ? 'Rappel 7 jours avant activé.' : 'Rappel 7 jours avant désactivé.')} />
              <Checkbox label="La veille" checked={settings.dayBefore} onChange={(e) => void update({ dayBefore: e.target.checked }, e.target.checked ? 'Rappel la veille activé.' : 'Rappel la veille désactivé.')} />
              <Checkbox
                label="Notification sur mon téléphone"
                checked={settings.phone}
                onChange={(e) => void update({ phone: e.target.checked }, e.target.checked ? 'Notifications enregistrées (simulées dans ce prototype).' : 'Notifications désactivées.')}
              />
              <Checkbox
                label="Par e-mail"
                checked={settings.email}
                onChange={(e) => void update({ email: e.target.checked }, e.target.checked ? 'Rappels par e-mail enregistrés (aucun e-mail n’est envoyé dans ce prototype).' : 'Rappels par e-mail désactivés.')}
              />
            </div>
            {example ? (
              <>
                <p className="overline muted">Exemple de rappel</p>
                <div className="notification-preview">
                  <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width={24} height={24} />
                  <div className="small">
                    <p className="strong">
                      Orient’Avenir · {example.daysLeft === 0 ? 'aujourd’hui' : example.daysLeft === 1 ? 'demain' : `dans ${example.daysLeft} jours`}
                    </p>
                    <p>
                      {example.deadline.title} le {formatShortDate(example.deadline.endDate ?? example.deadline.date)}, sur la plateforme officielle.
                    </p>
                  </div>
                </div>
              </>
            ) : null}
            {due.length ? (
              <p className="small text-ok" role="status">
                {due.length} rappel{due.length > 1 ? 's' : ''} dû{due.length > 1 ? 's' : ''} à la date du jour.
              </p>
            ) : null}
            <Button
              variant="secondary"
              block
              onClick={() => {
                downloadFile('orient-avenir-echeances.ics', deadlinesToIcs(upcoming), 'text/calendar')
                notify('Fichier agenda (.ics) téléchargé : ouvrez-le avec votre application de calendrier.', 'success')
              }}
            >
              Ajouter à mon agenda
            </Button>
          </section>
          <section className="card stack-sm" aria-labelledby="demo-date-title">
            <h2 id="demo-date-title" className="h3">
              Date du jour (démo)
            </h2>
            <p className="small muted">Simulez l’approche d’une échéance : les rappels et le compteur se recalculent.</p>
            <label htmlFor="simulated-date" className="field-label">
              Date simulée
            </label>
            <input
              id="simulated-date"
              type="date"
              className="input"
              value={simulated}
              min="2026-01-01"
              max="2027-12-31"
              onChange={(e) => setSimulated(e.target.value)}
              aria-invalid={dateError ? true : undefined}
              aria-describedby={dateError ? 'simulated-error' : 'simulated-current'}
            />
            {dateError ? (
              <p id="simulated-error" className="field-error">
                {dateError}
              </p>
            ) : null}
            <p id="simulated-current" className="small muted">
              Aujourd’hui pour l’application : {formatDate(today)}
              {settings.simulatedToday ? ' (simulée)' : ' (réelle)'}
            </p>
            <div className="cluster">
              <Button variant="secondary" onClick={() => void applyDate()}>
                Appliquer
              </Button>
              {settings.simulatedToday ? (
                <Button variant="ghost" onClick={() => void update({ simulatedToday: null }, 'Retour à la date réelle.')}>
                  Revenir à la date réelle
                </Button>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
