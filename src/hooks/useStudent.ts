import { useMemo, useState } from 'react'
import { useToast } from '../components'
import { comparisonRepo, errorMessage, favoriteRepo, formationRepo, studentRepo } from '../db/repositories'
import { findOpeningTrack, rankFormations, scoreFormation } from '../lib/scoring'
import type { FormationScore, FormationView } from '../types'
import { useRepo } from './useRepo'

export const useOwnProfile = (userId: string) => useRepo(() => studentRepo.getOwnProfile(userId), [userId])

export const usePublishedFormations = () => useRepo(() => formationRepo.listPublished(), [])

/** Pistes calculées pour le lycéen connecté : classement, scores et piste d'ouverture. */
export const usePistes = (userId: string) => {
  const profile = useOwnProfile(userId)
  const formations = usePublishedFormations()
  const computed = useMemo(() => {
    if (!profile.data || !formations.data) return undefined
    const candidates = formations.data.filter((f) => f.admissionLevel === 'post-bac')
    const ranked = rankFormations(candidates, profile.data)
    const opening = findOpeningTrack(ranked, profile.data)
    const scores = new Map<string, FormationScore>(formations.data.map((f) => [f.id, scoreFormation(f, profile.data!)]))
    return { ranked, opening, scores }
  }, [profile.data, formations.data])
  return {
    profile: profile.data,
    formations: formations.data,
    ranked: computed?.ranked,
    opening: computed?.opening ?? null,
    scores: computed?.scores,
    loading: profile.loading || formations.loading,
    error: profile.error ?? formations.error,
  }
}

export const useFavoriteIds = (userId: string) => useRepo(() => favoriteRepo.listFavoriteIds(userId), [userId])
export const useComparisonIds = (userId: string) => useRepo(() => comparisonRepo.getComparisonIds(userId), [userId])

/** Ajout et retrait des favoris et de la comparaison, avec retour annoncé et affichage immédiat (optimiste). */
export const useFormationActions = (userId: string) => {
  const { notify } = useToast()
  // Valeurs affichées avant la confirmation de la base ; annulées en cas d'échec.
  const [pending, setPending] = useState<Record<string, boolean>>({})

  const optimistic = (key: string, value: boolean) => {
    setPending((current) => ({ ...current, [key]: value }))
    window.setTimeout(() => setPending(({ [key]: _done, ...rest }) => rest), 1500)
  }
  const revert = (key: string) => setPending(({ [key]: _failed, ...rest }) => rest)

  const isFavorite = (id: string, ids: string[] | undefined) => pending[`fav:${id}`] ?? (ids ?? []).includes(id)
  const isCompared = (id: string, ids: string[] | undefined) => pending[`cmp:${id}`] ?? (ids ?? []).includes(id)

  const toggleFavorite = async (formation: Pick<FormationView, 'id' | 'title'>, current?: boolean) => {
    if (current !== undefined) optimistic(`fav:${formation.id}`, !current)
    try {
      const added = await favoriteRepo.toggleFavorite(userId, formation.id)
      notify(added ? `« ${formation.title} » ajoutée à vos favoris.` : `« ${formation.title} » retirée de vos favoris.`, 'success')
    } catch (error) {
      revert(`fav:${formation.id}`)
      notify(errorMessage(error, 'Le favori n’a pas pu être enregistré. Réessayez.'), 'error')
    }
  }

  const toggleCompare = async (formation: Pick<FormationView, 'id' | 'title'>, current?: boolean) => {
    if (current !== undefined) optimistic(`cmp:${formation.id}`, !current)
    try {
      const ids = await comparisonRepo.toggleComparison(userId, formation.id)
      notify(
        ids.includes(formation.id)
          ? `« ${formation.title} » ajoutée à la comparaison (${ids.length} sur 3).`
          : `« ${formation.title} » retirée de la comparaison.`,
        'success',
      )
      return ids
    } catch (error) {
      revert(`cmp:${formation.id}`)
      notify(errorMessage(error, 'La comparaison n’a pas pu être mise à jour. Réessayez.'), 'error')
      return null
    }
  }

  return { toggleFavorite, toggleCompare, isFavorite, isCompared }
}

export type FormationActions = ReturnType<typeof useFormationActions>
