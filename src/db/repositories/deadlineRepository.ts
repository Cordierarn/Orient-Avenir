import { db } from '../database'
import { daysBetween, fromIsoDay, toIsoDay } from '../../lib/dates'
import { newId, nowIso } from '../../lib/ids'
import type { Deadline, ReminderSettings } from '../../types'
import { NotFoundError, ValidationError } from './errors'
import { requireUser } from './internal'
import { getPublished } from './formationRepository'

/** Échéances officielles et échéances personnelles du lycéen connecté, triées par date. */
export const listDeadlines = async (actorId: string): Promise<Deadline[]> => {
  await requireUser(actorId, 'lyceen')
  const rows = await db.deadlines.filter((d) => d.ownerId === null || d.ownerId === actorId).toArray()
  return rows.sort((a, b) => a.date.localeCompare(b.date))
}

export const countPersonalUpcoming = async (actorId: string, today: Date) => {
  const day = toIsoDay(today)
  return db.deadlines.filter((d) => d.ownerId === actorId && (d.endDate ?? d.date) >= day).count()
}

export const addOpenDayFromFormation = async (actorId: string, formationId: string) => {
  await requireUser(actorId, 'lyceen')
  const formation = await getPublished(formationId)
  if (!formation) throw new NotFoundError('Cette formation n’est plus publiée par son établissement.')
  if (!formation.openDay) throw new ValidationError('Aucune journée portes ouvertes n’est annoncée pour cette formation.')
  const id = `dl-${actorId}-${formationId}`
  if (await db.deadlines.get(id)) return { alreadyAdded: true }
  await db.deadlines.add({
    id,
    ownerId: actorId,
    date: formation.openDay.date,
    title: `Portes ouvertes · ${formation.institution.shortName}`,
    subtitle: 'Ajoutée depuis la fiche formation',
    badge: 'favori',
    formationId,
    createdAt: nowIso(),
  })
  return { alreadyAdded: false }
}

export const addInstitutionEvent = async (actorId: string, institutionId: string, eventId: string) => {
  await requireUser(actorId, 'lyceen')
  const institution = await db.institutions.get(institutionId)
  const event = institution?.events.find((e) => e.id === eventId)
  if (!institution || !event) throw new NotFoundError('Cet événement n’est plus annoncé par l’établissement.')
  const existing = await db.deadlines.filter((d) => d.ownerId === actorId && d.institutionEventId === eventId).first()
  if (existing && existing.badge !== 'invitation') return { alreadyAdded: true }
  await db.deadlines.put({
    id: existing?.id ?? newId('dl'),
    ownerId: actorId,
    date: event.date,
    endDate: event.endDate,
    title: `${event.title} · ${institution.shortName}`,
    subtitle: 'Ajoutée depuis la page de l’école',
    badge: 'favori',
    institutionEventId: eventId,
    createdAt: nowIso(),
  })
  return { alreadyAdded: false }
}

export const removeDeadline = async (actorId: string, deadlineId: string) => {
  const deadline = await db.deadlines.get(deadlineId)
  if (!deadline || deadline.ownerId !== actorId) throw new NotFoundError('Seules vos propres échéances peuvent être retirées.')
  await db.deadlines.delete(deadlineId)
}

// ---------------------------------------------------------------------------
// Rappels
// ---------------------------------------------------------------------------

export const defaultReminders = (userId: string): ReminderSettings => ({
  userId,
  sevenDays: true,
  dayBefore: true,
  phone: false,
  email: false,
  simulatedToday: null,
  updatedAt: nowIso(),
})

export const getReminders = async (actorId: string) => {
  await requireUser(actorId, 'lyceen')
  return (await db.reminders.get(actorId)) ?? defaultReminders(actorId)
}

export const saveReminders = async (actorId: string, patch: Partial<Omit<ReminderSettings, 'userId'>>) => {
  const current = await getReminders(actorId)
  if (patch.simulatedToday && !/^\d{4}-\d{2}-\d{2}$/.test(patch.simulatedToday)) {
    throw new ValidationError('Date du jour invalide : utilisez le format JJ/MM/AAAA.')
  }
  const next = { ...current, ...patch, updatedAt: nowIso() }
  await db.reminders.put(next)
  return next
}

export const effectiveToday = (settings: Pick<ReminderSettings, 'simulatedToday'>) =>
  settings.simulatedToday ? fromIsoDay(settings.simulatedToday) : new Date()

export interface DueReminder {
  deadline: Deadline
  daysLeft: number
}

/** Échéances dont le rappel est dû à la date du jour (réelle ou simulée). */
export const computeDueReminders = (deadlines: Deadline[], settings: ReminderSettings, today: Date): DueReminder[] =>
  deadlines.flatMap((deadline) => {
    const daysLeft = daysBetween(today, fromIsoDay(deadline.date))
    const due = (settings.sevenDays && daysLeft >= 0 && daysLeft <= 7) || (settings.dayBefore && daysLeft >= 0 && daysLeft <= 1)
    return due ? [{ deadline, daysLeft }] : []
  })
