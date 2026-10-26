import { db } from '../database'
import { formatSlot } from '../../lib/dates'
import { newId, nowIso } from '../../lib/ids'
import type { Appointment, AppointmentRequest, ExchangeFormat } from '../../types'
import { AccessDeniedError, NotFoundError, ValidationError } from './errors'
import { counselorHasAccess, displayName, isShareActive, log, requireAccount, requireUser } from './internal'

export interface RequestInput {
  slots: string[]
  format: ExchangeFormat
  preferredCounselorId: string | null
  topic: string
}

export const MIN_SLOTS = 2

export const validateRequest = (input: RequestInput) => {
  const errors: Partial<Record<'slots' | 'topic', string>> = {}
  if (input.slots.length < MIN_SLOTS)
    errors.slots = `Cochez au moins deux créneaux (${input.slots.length} sélectionné${input.slots.length > 1 ? 's' : ''}).`
  if (input.topic.length > 500) errors.topic = 'Votre message dépasse 500 caractères : raccourcissez-le.'
  return errors
}

export const createRequest = async (actorId: string, input: RequestInput) => {
  const student = await requireAccount(actorId, 'lyceen', 'La demande de rendez-vous nécessite un compte : un conseiller doit pouvoir vous répondre.')
  const errors = validateRequest(input)
  if (Object.keys(errors).length) throw new ValidationError('La demande est incomplète.', errors)
  if (!(await isShareActive(actorId, 'conseiller'))) {
    throw new ValidationError('Acceptez le partage de votre dossier : sans lui, aucun conseiller ne peut voir votre demande.')
  }
  const pending = await db.appointmentRequests.where('studentId').equals(actorId).filter((r) => r.status === 'en_attente').first()
  if (pending) throw new ValidationError('Une demande est déjà en attente : annulez-la avant d’en envoyer une nouvelle.')
  let counselorName = 'tous les conseillers proposés'
  if (input.preferredCounselorId) {
    const counselor = await db.users.get(input.preferredCounselorId)
    if (!counselor || counselor.role !== 'conseiller') throw new NotFoundError('Ce conseiller n’est plus disponible. Choisissez-en un autre.')
    counselorName = displayName(counselor)
  }
  const now = nowIso()
  const request: AppointmentRequest = {
    id: newId('req'),
    studentId: actorId,
    preferredCounselorId: input.preferredCounselorId,
    slots: [...input.slots].sort(),
    format: input.format,
    topic: input.topic.trim(),
    status: 'en_attente',
    declinedBy: [],
    createdAt: now,
    updatedAt: now,
  }
  await db.appointmentRequests.add(request)
  const formatLabel = { visio: 'visio', chat: 'chat écrit', indifferent: 'format indifférent' }[input.format]
  await log(student.id, student, 'rdv_demande', `Demande de rendez-vous envoyée à ${counselorName} (${request.slots.length} créneaux, ${formatLabel}).`)
  return request
}

export interface StudentRequestView {
  request: AppointmentRequest
  appointment: Appointment | null
  counselor: { id: string; name: string } | null
  preferredCounselor: { id: string; name: string } | null
}

/** Dernière demande du lycéen connecté (hors annulées), avec le rendez-vous associé. */
export const getLatestRequest = async (actorId: string): Promise<StudentRequestView | null> => {
  await requireUser(actorId, 'lyceen')
  const requests = (await db.appointmentRequests.where('studentId').equals(actorId).toArray())
    .filter((r) => r.status !== 'annulee')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const request = requests[0]
  if (!request) return null
  const appointment = request.appointmentId ? ((await db.appointments.get(request.appointmentId)) ?? null) : null
  const counselorUser = request.acceptedBy ? await db.users.get(request.acceptedBy) : undefined
  const preferredUser = request.preferredCounselorId ? await db.users.get(request.preferredCounselorId) : undefined
  return {
    request,
    appointment,
    counselor: counselorUser ? { id: counselorUser.id, name: displayName(counselorUser) } : null,
    preferredCounselor: preferredUser ? { id: preferredUser.id, name: displayName(preferredUser) } : null,
  }
}

export const cancelRequest = async (actorId: string, requestId: string) => {
  const student = await requireAccount(actorId, 'lyceen')
  const request = await db.appointmentRequests.get(requestId)
  if (!request || request.studentId !== actorId) throw new NotFoundError('Demande introuvable.')
  if (request.status !== 'en_attente') throw new ValidationError('Seule une demande en attente peut être annulée.')
  await db.appointmentRequests.update(requestId, { status: 'annulee', updatedAt: nowIso() })
  await log(student.id, student, 'rdv_annule', 'Demande de rendez-vous annulée.')
}

const requireVisibleRequest = async (counselorId: string, requestId: string) => {
  const counselor = await requireAccount(counselorId, 'conseiller')
  const request = await db.appointmentRequests.get(requestId)
  if (!request) throw new NotFoundError('Cette demande n’existe plus.')
  if (!(await counselorHasAccess(counselorId, request.studentId))) {
    throw new AccessDeniedError('Cette demande n’est plus accessible : l’élève a peut-être retiré son partage.')
  }
  if (request.status !== 'en_attente') throw new ValidationError('Cette demande a déjà été traitée.')
  return { counselor, request }
}

export const acceptRequest = async (counselorId: string, requestId: string, slot: string) => {
  const { counselor, request } = await requireVisibleRequest(counselorId, requestId)
  if (!request.slots.includes(slot)) throw new ValidationError('Choisissez l’un des créneaux proposés par l’élève.')
  const now = nowIso()
  const appointment: Appointment = {
    id: newId('apt'),
    requestId,
    studentId: request.studentId,
    counselorId,
    startsAt: slot,
    format: request.format === 'chat' ? 'chat' : 'visio',
    durationMinutes: 30,
    status: 'planifie',
    createdAt: now,
  }
  const student = await db.users.get(request.studentId)
  await db.transaction('rw', [db.appointmentRequests, db.appointments, db.activityLog], async () => {
    await db.appointments.add(appointment)
    await db.appointmentRequests.update(requestId, {
      status: 'acceptee',
      acceptedBy: counselorId,
      acceptedSlot: slot,
      appointmentId: appointment.id,
      updatedAt: now,
    })
    const when = formatSlot(slot)
    await log(counselor.id, counselor, 'rdv_accepte', `Créneau accepté avec ${student ? displayName(student) : 'un élève'} : ${when}.`)
    await log(request.studentId, counselor, 'rdv_accepte', `${displayName(counselor)} a accepté votre demande : ${when}.`)
  })
  return appointment
}

/**
 * « Laisser à un autre conseiller » : la demande redevient ouverte aux autres conseillers.
 * Si plus aucun conseiller ne peut la prendre, elle passe au statut refusée.
 */
export const declineRequest = async (counselorId: string, requestId: string) => {
  const { counselor, request } = await requireVisibleRequest(counselorId, requestId)
  const declinedBy = [...new Set([...request.declinedBy, counselorId])]
  const counselors = await db.users.where('role').equals('conseiller').toArray()
  const remaining = counselors.filter((c) => !declinedBy.includes(c.id))
  const status = remaining.length ? 'en_attente' : 'refusee'
  await db.appointmentRequests.update(requestId, { declinedBy, preferredCounselorId: null, status, updatedAt: nowIso() })
  await log(counselor.id, counselor, 'rdv_laisse', 'Demande laissée à un autre conseiller.')
  await log(
    request.studentId,
    counselor,
    'rdv_laisse',
    status === 'refusee'
      ? 'Aucun conseiller n’a pu accepter votre demande : vous pouvez en envoyer une nouvelle.'
      : `${displayName(counselor)} a laissé votre demande à un autre conseiller, mieux placé pour vous répondre.`,
  )
  return status
}

/** Change le format d'un rendez-vous (visio ↔ chat écrit). Réservé aux deux participants. */
export const setAppointmentFormat = async (actorId: string, appointmentId: string, format: 'visio' | 'chat') => {
  await requireAccount(actorId)
  const appointment = await db.appointments.get(appointmentId)
  if (!appointment || (appointment.studentId !== actorId && appointment.counselorId !== actorId)) {
    throw new AccessDeniedError('Ce rendez-vous ne vous concerne pas.')
  }
  await db.appointments.update(appointmentId, { format })
}

/** Rendez-vous à venir ou passés du lycéen connecté. */
export const listStudentAppointments = async (actorId: string) => {
  await requireUser(actorId, 'lyceen')
  return (await db.appointments.where('studentId').equals(actorId).toArray()).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}
