import { db } from '../database'
import { newId, nowIso } from '../../lib/ids'
import type { Favorite, FormationView } from '../../types'
import { NotFoundError, ValidationError } from './errors'
import { requireUser } from './internal'
import { getPublished, getPublishedMany } from './formationRepository'

export interface FavoriteView extends Favorite {
  formation: FormationView
}

/** Favoris du compte connecté uniquement (invité compris). */
export const listFavorites = async (actorId: string): Promise<FavoriteView[]> => {
  await requireUser(actorId, 'lyceen')
  const favorites = await db.favorites.where('userId').equals(actorId).toArray()
  const formations = new Map((await getPublishedMany(favorites.map((f) => f.formationId))).map((f) => [f.id, f]))
  return favorites
    .flatMap((fav) => {
      const formation = formations.get(fav.formationId)
      return formation ? [{ ...fav, formation }] : []
    })
    .sort((a, b) => a.addedAt.localeCompare(b.addedAt))
}

export const listFavoriteIds = async (actorId: string) =>
  (await db.favorites.where('userId').equals(actorId).toArray()).map((f) => f.formationId)

export const addFavorite = async (actorId: string, formationId: string) => {
  await requireUser(actorId, 'lyceen')
  if (!(await getPublished(formationId))) throw new NotFoundError('Cette formation n’est plus publiée par son établissement.')
  const existing = await db.favorites.where('[userId+formationId]').equals([actorId, formationId]).first()
  if (existing) return existing
  const favorite: Favorite = { id: newId('fav'), userId: actorId, formationId, note: '', addedAt: nowIso() }
  await db.favorites.add(favorite)
  return favorite
}

export const removeFavorite = async (actorId: string, formationId: string) => {
  await requireUser(actorId, 'lyceen')
  await db.favorites.where('[userId+formationId]').equals([actorId, formationId]).delete()
}

export const toggleFavorite = async (actorId: string, formationId: string) => {
  const existing = await db.favorites.where('[userId+formationId]').equals([actorId, formationId]).first()
  if (existing) {
    await removeFavorite(actorId, formationId)
    return false
  }
  await addFavorite(actorId, formationId)
  return true
}

export const NOTE_MAX_LENGTH = 1000

export const updateNote = async (actorId: string, formationId: string, note: string) => {
  await requireUser(actorId, 'lyceen')
  if (note.length > NOTE_MAX_LENGTH) throw new ValidationError(`Votre note dépasse ${NOTE_MAX_LENGTH} caractères : raccourcissez-la pour l’enregistrer.`)
  const existing = await db.favorites.where('[userId+formationId]').equals([actorId, formationId]).first()
  if (!existing) throw new NotFoundError('Ajoutez d’abord cette formation à vos favoris pour y associer une note.')
  await db.favorites.update(existing.id, { note })
}
