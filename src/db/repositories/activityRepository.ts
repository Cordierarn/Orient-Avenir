import { db } from '../database'
import type { ActivityEntry } from '../../types'
import { requireUser } from './internal'

/** Historique du compte connecté uniquement, du plus récent au plus ancien. */
export const listActivity = async (actorId: string, limit = 100): Promise<ActivityEntry[]> => {
  await requireUser(actorId)
  const rows = await db.activityLog.where('[userId+at]').between([actorId, ''], [actorId, '￿']).reverse().limit(limit).toArray()
  return rows
}
