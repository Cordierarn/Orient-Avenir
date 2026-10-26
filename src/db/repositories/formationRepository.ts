import { db } from '../database'
import { newId, nowIso } from '../../lib/ids'
import { formatDate } from '../../lib/dates'
import { ANONYMITY_THRESHOLD, maskSmall } from '../../lib/text'
import type { Formation, FormationView, Institution } from '../../types'
import { NotFoundError, ValidationError } from './errors'
import { log, requireAccount } from './internal'

const summarize = (institution: Institution): FormationView['institution'] => ({
  id: institution.id,
  name: institution.name,
  shortName: institution.shortName,
  city: institution.city,
  citySize: institution.citySize,
  distanceKm: institution.distanceKm,
  sector: institution.sector,
})

const withInstitutions = async (formations: Formation[]): Promise<FormationView[]> => {
  const institutions = new Map((await db.institutions.toArray()).map((i) => [i.id, i]))
  return formations.flatMap((f) => {
    const institution = institutions.get(f.institutionId)
    return institution ? [{ ...f, institution: summarize(institution) }] : []
  })
}

/** Formations publiées : identiques pour tous les rôles. Les brouillons ne sont jamais renvoyés. */
export const listPublished = async (): Promise<FormationView[]> =>
  withInstitutions(await db.formations.where('status').equals('publiee').toArray())

export const getPublished = async (id: string): Promise<FormationView | null> => {
  const formation = await db.formations.get(id)
  if (!formation || formation.status !== 'publiee') return null
  return (await withInstitutions([formation]))[0] ?? null
}

export const getPublishedMany = async (ids: string[]): Promise<FormationView[]> => {
  const rows = (await db.formations.bulkGet(ids)).filter((f): f is Formation => Boolean(f && f.status === 'publiee'))
  return withInstitutions(rows)
}

// ---------------------------------------------------------------------------
// Espace établissement
// ---------------------------------------------------------------------------

export type EditableField = 'title' | 'typeLong' | 'durationLabel' | 'summary' | 'outcomes' | 'vigilance'

export type FormationDraft = Pick<Formation, EditableField> &
  Partial<
    Pick<
      Formation,
      'typeShort' | 'durationYears' | 'places' | 'alternance' | 'tags' | 'specialites' | 'keywords' | 'practicePercent'
    >
  >

export const REQUIRED_MESSAGES: Record<EditableField, string> = {
  title: 'Indiquez l’intitulé de la formation.',
  typeLong: 'Indiquez le type de diplôme.',
  durationLabel: 'Indiquez la durée et le rythme.',
  summary: 'Décrivez la formation en quelques phrases.',
  outcomes: 'Indiquez au moins un métier ou une poursuite d’études.',
  vigilance: 'Indiquez une difficulté ou un point d’attention pour les futurs étudiants.',
}

export const FIELD_ORDER: EditableField[] = ['title', 'typeLong', 'durationLabel', 'summary', 'outcomes', 'vigilance']

export const validateForPublication = (draft: FormationDraft) => {
  const errors: Partial<Record<EditableField, string>> = {}
  for (const field of FIELD_ORDER) if (!draft[field]?.trim()) errors[field] = REQUIRED_MESSAGES[field]
  return errors
}

const requireInstitutionAccount = async (actorId: string) => {
  const user = await requireAccount(actorId, 'etablissement')
  if (!user.institutionId) throw new ValidationError('Rattachez d’abord votre compte à un établissement.')
  return { user, institutionId: user.institutionId }
}

export const listForInstitution = async (actorId: string): Promise<Formation[]> => {
  const { institutionId } = await requireInstitutionAccount(actorId)
  const rows = await db.formations.where('institutionId').equals(institutionId).toArray()
  // Ordre stable : brouillons d'abord, puis admissions post-bac avant bac + 2, puis par intitulé.
  const rank = (f: Formation) => (f.status === 'brouillon' ? 0 : f.admissionLevel === 'post-bac' ? 1 : 2)
  return rows.sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title, 'fr'))
}

const requireOwnFormation = async (actorId: string, formationId: string) => {
  const { user, institutionId } = await requireInstitutionAccount(actorId)
  const formation = await db.formations.get(formationId)
  if (!formation || formation.institutionId !== institutionId) throw new NotFoundError('Cette fiche n’appartient pas à votre établissement.')
  return { user, formation }
}

const clean = (draft: FormationDraft): Partial<Formation> => {
  const patch: Partial<Formation> = {}
  for (const field of FIELD_ORDER) patch[field] = draft[field].trim()
  for (const key of ['typeShort', 'durationYears', 'places', 'alternance', 'tags', 'specialites', 'keywords', 'practicePercent'] as const) {
    if (draft[key] !== undefined) (patch as Record<string, unknown>)[key] = draft[key]
  }
  return patch
}

/** Applique un brouillon ; poids de domaines et libellé d'alternance ne changent que si l'établissement les modifie. */
const merge = (formation: Formation, draft: FormationDraft): Formation => {
  const merged: Formation = { ...formation, ...clean(draft) }
  if (draft.tags && draft.tags.join() !== formation.tags.join()) {
    // Premier domaine = principal ; il alimente le calcul d'affinité.
    merged.domainWeights = Object.fromEntries(draft.tags.map((id, index) => [id, index === 0 ? 1 : 0.6]))
  }
  if (merged.alternance !== formation.alternance) merged.alternanceLabel = merged.alternance ? 'Possible' : 'Non'
  return merged
}

/** Enregistre un brouillon : la fiche n'est plus visible des lycéens tant qu'elle n'est pas publiée. */
export const saveDraft = async (actorId: string, formationId: string, draft: FormationDraft) => {
  const { formation } = await requireOwnFormation(actorId, formationId)
  const updated: Formation = { ...merge(formation, draft), status: 'brouillon', updatedAt: nowIso() }
  await db.formations.put(updated)
  return updated
}

export const publish = async (actorId: string, formationId: string, draft: FormationDraft) => {
  const { user, formation } = await requireOwnFormation(actorId, formationId)
  const errors = validateForPublication(draft)
  const count = Object.keys(errors).length
  if (count) {
    // Brouillon : les autres saisies sont conservées. Fiche publiée : rien ne change côté lycéen,
    // la saisie reste dans le formulaire.
    if (formation.status === 'brouillon') await db.formations.put({ ...merge(formation, draft), status: 'brouillon', updatedAt: nowIso() })
    throw new ValidationError<EditableField>(`${count} rubrique${count > 1 ? 's' : ''} à compléter avant publication`, errors)
  }
  const now = nowIso()
  const wasPublished = formation.status === 'publiee'
  const updated: Formation = { ...merge(formation, draft), status: 'publiee', updatedAt: now, publishedAt: now }
  await db.transaction('rw', [db.formations, db.institutions, db.activityLog], async () => {
    await db.formations.put(updated)
    await db.institutions.update(formation.institutionId, {
      updatedAt: now,
      updatedBy: `${user.firstName} ${user.lastName}`,
    })
    await log(
      user.id,
      user,
      'fiche_publiee',
      wasPublished
        ? `Fiche « ${updated.title} » mise à jour le ${formatDate(now)}.`
        : `Fiche « ${updated.title} » publiée le ${formatDate(now)} : visible côté lycéen.`,
    )
  })
  return updated
}

export const createFormation = async (actorId: string, title: string) => {
  const { institutionId } = await requireInstitutionAccount(actorId)
  if (!title.trim()) throw new ValidationError('Indiquez l’intitulé de la nouvelle fiche.', { title: 'Indiquez l’intitulé de la nouvelle fiche.' })
  const institution = await db.institutions.get(institutionId)
  const now = nowIso()
  const formation: Formation = {
    id: newId('f'),
    institutionId,
    title: title.trim(),
    typeShort: 'Licence',
    typeLong: '',
    admissionLevel: 'post-bac',
    durationYears: 3,
    durationLabel: '',
    selectivity: 'selective',
    selectivityLabel: 'Sélective, sur dossier',
    alternance: false,
    alternanceLabel: 'Non',
    practicePercent: 50,
    learningLabel: 'Cours et projets',
    specialites: [],
    domainWeights: {},
    tags: [],
    summary: '',
    outcomes: '',
    vigilance: '',
    criteria: [
      { label: 'Résultats généraux', weight: 50 },
      { label: 'Projet de formation motivé', weight: 50 },
    ],
    criteriaSummary: 'Résultats généraux, projet',
    places: 30,
    candidates: 0,
    closeProfilesRange: 'Non renseigné',
    cost: institution?.sector === 'prive' ? 'Frais de scolarité' : 'Frais universitaires',
    keywords: [],
    status: 'brouillon',
    updatedAt: now,
  }
  await db.formations.add(formation)
  return formation
}

// ---------------------------------------------------------------------------
// Chiffres d'intérêt : uniquement agrégés et masqués sous 10.
// ---------------------------------------------------------------------------

export interface InterestStat {
  formationId: string
  title: string
  status: Formation['status']
  favorites: number | null
  comparisons: number | null
  favoritesLabel: string
  comparisonsLabel: string
  trend: 'En hausse' | 'Stable' | 'En baisse' | 'Masqué'
}

export const getInterestStats = async (actorId: string): Promise<InterestStat[]> => {
  const formations = await listForInstitution(actorId)
  const ids = new Set(formations.map((f) => f.id))
  const guests = new Set((await db.users.filter((u) => u.isGuest).toArray()).map((u) => u.id))
  const favoriteCounts = new Map<string, number>()
  await db.favorites.each((fav) => {
    if (ids.has(fav.formationId) && !guests.has(fav.userId)) favoriteCounts.set(fav.formationId, (favoriteCounts.get(fav.formationId) ?? 0) + 1)
  })
  const comparisonCounts = new Map<string, number>()
  await db.comparisons.each((cmp) => {
    if (guests.has(cmp.userId)) return
    for (const id of cmp.formationIds) if (ids.has(id)) comparisonCounts.set(id, (comparisonCounts.get(id) ?? 0) + 1)
  })
  const trendLabel = { hausse: 'En hausse', stable: 'Stable', baisse: 'En baisse' } as const
  return formations
    .map((f) => {
      const favorites = (f.interestBaseline?.favorites ?? 0) + (favoriteCounts.get(f.id) ?? 0)
      const comparisons = (f.interestBaseline?.comparisons ?? 0) + (comparisonCounts.get(f.id) ?? 0)
      const masked = favorites < ANONYMITY_THRESHOLD && comparisons < ANONYMITY_THRESHOLD
      return {
        formationId: f.id,
        title: f.title,
        status: f.status,
        // Les valeurs sous le seuil ne quittent jamais le repository.
        favorites: favorites < ANONYMITY_THRESHOLD ? null : favorites,
        comparisons: comparisons < ANONYMITY_THRESHOLD ? null : comparisons,
        favoritesLabel: maskSmall(favorites),
        comparisonsLabel: maskSmall(comparisons),
        trend: masked ? ('Masqué' as const) : trendLabel[f.interestBaseline?.trend ?? 'stable'],
      }
    })
    .sort((a, b) => (b.favorites ?? 0) - (a.favorites ?? 0))
}
