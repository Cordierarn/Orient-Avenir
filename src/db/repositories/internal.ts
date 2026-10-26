import { db } from '../database'
import { newId, nowIso } from '../../lib/ids'
import { shortName } from '../../lib/text'
import type { ActivityType, PublicUser, Role, User } from '../../types'
import { AccessDeniedError, GuestForbiddenError, NotFoundError } from './errors'

/** Helpers partagés entre repositories (non exportés vers l'interface). */

export const toPublicUser = ({ credential: _credential, ...user }: User): PublicUser => user

export const displayName = (user: Pick<User, 'firstName' | 'lastName' | 'role'>) =>
  user.role === 'etablissement' ? `${user.firstName} ${user.lastName}` : shortName(user.firstName, user.lastName)

export const requireUser = async (userId: string, role?: Role) => {
  const user = await db.users.get(userId)
  if (!user) throw new NotFoundError('Compte introuvable. Reconnectez-vous.')
  if (role && user.role !== role) throw new AccessDeniedError('Cette action est réservée à un autre espace.')
  return user
}

export const requireAccount = async (userId: string, role?: Role, guestMessage?: string) => {
  const user = await requireUser(userId, role)
  if (user.isGuest) throw new GuestForbiddenError(guestMessage)
  return user
}

export const log = async (
  userId: string,
  actor: Pick<User, 'id' | 'firstName' | 'lastName' | 'role'>,
  type: ActivityType,
  description: string,
) => {
  await db.activityLog.add({
    id: newId('act'),
    userId,
    actorId: actor.id,
    actorName: displayName(actor),
    type,
    description,
    at: nowIso(),
  })
}

export const conversationId = (studentId: string, counselorId: string) => `${studentId}__${counselorId}`

export const isShareActive = async (studentId: string, audience: 'conseiller' | 'etablissements') => {
  const share = await db.shares.get(`${studentId}:${audience}`)
  return Boolean(share?.active)
}

/**
 * Un conseiller accède au dossier d'un élève si l'élève a accepté le partage
 * et qu'un lien existe : demande qui lui est adressée (ou ouverte à tous) ou rendez-vous commun.
 */
export const counselorHasAccess = async (counselorId: string, studentId: string) => {
  if (!(await isShareActive(studentId, 'conseiller'))) return false
  const requests = await db.appointmentRequests.where('studentId').equals(studentId).toArray()
  const linkedByRequest = requests.some(
    (r) =>
      (r.status === 'en_attente' &&
        (r.preferredCounselorId === counselorId || (r.preferredCounselorId === null && !r.declinedBy.includes(counselorId)))) ||
      (r.status === 'acceptee' && r.acceptedBy === counselorId),
  )
  if (linkedByRequest) return true
  const appointments = await db.appointments.where('studentId').equals(studentId).toArray()
  return appointments.some((a) => a.counselorId === counselorId && a.status !== 'annule')
}
