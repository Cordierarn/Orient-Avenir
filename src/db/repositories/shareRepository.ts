import { db } from '../database'
import { nowIso } from '../../lib/ids'
import type { Share, ShareAudience } from '../../types'
import { log, requireAccount, requireUser } from './internal'

export interface ShareState {
  conseiller: Share | null
  etablissements: Share | null
}

export const getShares = async (actorId: string): Promise<ShareState> => {
  await requireUser(actorId, 'lyceen')
  const [conseiller, etablissements] = await Promise.all([
    db.shares.get(`${actorId}:conseiller`),
    db.shares.get(`${actorId}:etablissements`),
  ])
  return { conseiller: conseiller ?? null, etablissements: etablissements ?? null }
}

const DESCRIPTIONS: Record<ShareAudience, { on: string; off: string }> = {
  conseiller: {
    on: 'Partage du dossier avec un conseiller accordé.',
    off: 'Partage du dossier retiré : les conseillers n’y ont plus accès.',
  },
  etablissements: {
    on: 'Profil simplifié rendu visible par les écoles de votre liste.',
    off: 'Visibilité auprès des écoles retirée : votre profil leur est masqué.',
  },
}

/** Consentement explicite, daté, révocable et journalisé. Interdit en mode invité. */
export const setShare = async (actorId: string, audience: ShareAudience, active: boolean) => {
  const user = await requireAccount(
    actorId,
    'lyceen',
    audience === 'conseiller'
      ? 'Le partage de dossier nécessite un compte : en mode invité, rien ne quitte cet appareil.'
      : 'La visibilité auprès des établissements nécessite un compte.',
  )
  const id = `${actorId}:${audience}`
  const current = await db.shares.get(id)
  if (Boolean(current?.active) === active) return current
  const now = nowIso()
  const next: Share = active
    ? { id, studentId: actorId, audience, active: true, grantedAt: now }
    : { id, studentId: actorId, audience, active: false, grantedAt: current?.grantedAt, revokedAt: now }
  await db.shares.put(next)
  const type = audience === 'conseiller' ? (active ? 'partage_accorde' : 'partage_retire') : active ? 'visibilite_accordee' : 'visibilite_retiree'
  await log(user.id, user, type, DESCRIPTIONS[audience][active ? 'on' : 'off'])
  return next
}
