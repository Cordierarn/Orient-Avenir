import { db } from '../database'
import { nowIso } from '../../lib/ids'
import type { FormationView } from '../../types'
import { NotFoundError, ValidationError } from './errors'
import { requireUser } from './internal'
import { getPublished, getPublishedMany } from './formationRepository'

export const MAX_COMPARED = 3

export const getComparisonIds = async (actorId: string) => {
  await requireUser(actorId, 'lyceen')
  return (await db.comparisons.get(actorId))?.formationIds ?? []
}

/** Formations comparées encore publiées, dans l'ordre d'ajout. */
export const getCompared = async (actorId: string): Promise<FormationView[]> => {
  const ids = await getComparisonIds(actorId)
  const formations = new Map((await getPublishedMany(ids)).map((f) => [f.id, f]))
  return ids.flatMap((id) => formations.get(id) ?? [])
}

const save = (userId: string, formationIds: string[]) => db.comparisons.put({ userId, formationIds, updatedAt: nowIso() })

export const addToComparison = async (actorId: string, formationId: string) => {
  const ids = await getComparisonIds(actorId)
  if (ids.includes(formationId)) return ids
  if (ids.length >= MAX_COMPARED)
    throw new ValidationError('Vous comparez déjà 3 formations : retirez-en une pour en ajouter une autre.')
  if (!(await getPublished(formationId))) throw new NotFoundError('Cette formation n’est plus publiée par son établissement.')
  const next = [...ids, formationId]
  await save(actorId, next)
  return next
}

export const removeFromComparison = async (actorId: string, formationId: string) => {
  const ids = await getComparisonIds(actorId)
  const next = ids.filter((id) => id !== formationId)
  await save(actorId, next)
  return next
}

export const toggleComparison = async (actorId: string, formationId: string) => {
  const ids = await getComparisonIds(actorId)
  return ids.includes(formationId) ? removeFromComparison(actorId, formationId) : addToComparison(actorId, formationId)
}
