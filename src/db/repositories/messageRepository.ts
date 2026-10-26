import { db } from '../database'
import { newId, nowIso } from '../../lib/ids'
import { initials } from '../../lib/text'
import type { Message } from '../../types'
import { AccessDeniedError, ValidationError } from './errors'
import { conversationId, displayName, requireAccount } from './internal'

export const MESSAGE_MAX_LENGTH = 2000

const pair = async (actorId: string, otherId: string) => {
  const actor = await requireAccount(actorId, undefined, 'La messagerie nécessite un compte.')
  const other = await db.users.get(otherId)
  if (!other || other.isGuest) throw new AccessDeniedError('Interlocuteur introuvable.')
  const roles = new Set([actor.role, other.role])
  if (!(roles.has('lyceen') && roles.has('conseiller'))) throw new AccessDeniedError('La messagerie relie un lycéen et son conseiller.')
  const studentId = actor.role === 'lyceen' ? actor.id : other.id
  const counselorId = actor.role === 'conseiller' ? actor.id : other.id
  const appointments = await db.appointments.where('studentId').equals(studentId).toArray()
  if (!appointments.some((a) => a.counselorId === counselorId && a.status !== 'annule')) {
    throw new AccessDeniedError('L’échange s’ouvre lorsqu’un conseiller a accepté un rendez-vous.')
  }
  return { actor, other, id: conversationId(studentId, counselorId) }
}

/** Messages d'une conversation : seuls ses deux participants peuvent les lire. */
export const listMessages = async (actorId: string, otherId: string): Promise<Message[]> => {
  const { id } = await pair(actorId, otherId)
  return db.messages.where('[conversationId+sentAt]').between([id, ''], [id, '￿']).toArray()
}

export const sendMessage = async (actorId: string, otherId: string, body: string) => {
  const trimmed = body.trim()
  if (!trimmed) throw new ValidationError('Écrivez un message avant de l’envoyer.')
  if (trimmed.length > MESSAGE_MAX_LENGTH) throw new ValidationError(`Votre message dépasse ${MESSAGE_MAX_LENGTH} caractères.`)
  const { actor, id } = await pair(actorId, otherId)
  // Horodatage strictement croissant dans une conversation : l'ordre chronologique reste garanti.
  const last = await db.messages.where('[conversationId+sentAt]').between([id, ''], [id, '￿']).last()
  let sentAt = nowIso()
  if (last && sentAt <= last.sentAt) sentAt = new Date(new Date(last.sentAt).getTime() + 1).toISOString()
  const message: Message = { id: newId('msg'), conversationId: id, senderId: actor.id, recipientId: otherId, body: trimmed, sentAt }
  await db.messages.add(message)
  return message
}

export interface Contact {
  id: string
  name: string
  initials: string
}

/** Conseiller attitré du lycéen : celui de son rendez-vous le plus récent. */
export const getStudentCounselor = async (actorId: string): Promise<Contact | null> => {
  await requireAccount(actorId, 'lyceen', 'La messagerie nécessite un compte.')
  const appointments = (await db.appointments.where('studentId').equals(actorId).toArray())
    .filter((a) => a.status !== 'annule')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  if (!appointments[0]) return null
  const counselor = await db.users.get(appointments[0].counselorId)
  return counselor ? { id: counselor.id, name: displayName(counselor), initials: initials(counselor.firstName, counselor.lastName) } : null
}

export const getContact = async (actorId: string, otherId: string): Promise<Contact> => {
  const { other } = await pair(actorId, otherId)
  return { id: other.id, name: displayName(other), initials: initials(other.firstName, other.lastName) }
}
