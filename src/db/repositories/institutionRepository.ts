import { db } from '../database'
import { newId, nowIso } from '../../lib/ids'
import { ANONYMITY_THRESHOLD } from '../../lib/text'
import type { CitySize, Institution, Sector } from '../../types'
import { AccessDeniedError, NotFoundError, ValidationError } from './errors'
import { displayName, log, requireAccount } from './internal'
import type { InstitutionStudentProfile } from './studentRepository'

export const getInstitution = async (id: string): Promise<Institution | null> => (await db.institutions.get(id)) ?? null

export const listInstitutions = async () => (await db.institutions.toArray()).sort((a, b) => a.name.localeCompare(b.name, 'fr'))

export const getOwnInstitution = async (actorId: string): Promise<Institution | null> => {
  const user = await requireAccount(actorId, 'etablissement')
  return user.institutionId ? ((await db.institutions.get(user.institutionId)) ?? null) : null
}

export const attachToInstitution = async (actorId: string, institutionId: string) => {
  await requireAccount(actorId, 'etablissement')
  if (!(await db.institutions.get(institutionId))) throw new NotFoundError('Établissement introuvable : choisissez-en un dans la liste.')
  await db.users.update(actorId, { institutionId, onboarded: true })
}

export interface InstitutionInput {
  name: string
  kind: string
  city: string
  citySize: CitySize | ''
  sector: Sector | ''
  distanceKm: string
}

export const validateInstitution = (input: InstitutionInput) => {
  const errors: Partial<Record<keyof InstitutionInput, string>> = {}
  if (!input.name.trim()) errors.name = 'Indiquez le nom de l’établissement.'
  if (!input.kind.trim()) errors.kind = 'Indiquez le type d’établissement, par exemple « Université ».'
  if (!input.city.trim()) errors.city = 'Indiquez la ville.'
  if (!input.citySize) errors.citySize = 'Choisissez la taille de la ville.'
  if (!input.sector) errors.sector = 'Indiquez si l’établissement est public ou privé.'
  const distance = Number(input.distanceKm)
  if (!input.distanceKm.trim() || Number.isNaN(distance) || distance < 0 || distance > 1000)
    errors.distanceKm = 'Indiquez la distance depuis Valmont en kilomètres (entre 0 et 1 000).'
  return errors
}

export const createInstitution = async (actorId: string, input: InstitutionInput) => {
  await requireAccount(actorId, 'etablissement')
  const errors = validateInstitution(input)
  if (Object.keys(errors).length) throw new ValidationError('Certaines informations manquent.', errors)
  const institution: Institution = {
    id: newId('inst'),
    name: input.name.trim(),
    shortName: input.name.trim(),
    kind: input.kind.trim(),
    city: input.city.trim(),
    citySize: input.citySize as CitySize,
    distanceKm: Math.round(Number(input.distanceKm)),
    sector: input.sector as Sector,
    testimonials: [],
    events: [],
    updatedAt: nowIso(),
  }
  await db.transaction('rw', [db.institutions, db.users], async () => {
    await db.institutions.add(institution)
    await db.users.update(actorId, { institutionId: institution.id, onboarded: true })
  })
  return institution
}

// ---------------------------------------------------------------------------
// Profils intéressés : seulement les lycéens ayant donné leur accord.
// ---------------------------------------------------------------------------

export interface InterestedProfile extends InstitutionStudentProfile {
  openDay: 'inscrit' | 'invite' | 'aucun'
}

export interface InterestedProfilesResult {
  profiles: InterestedProfile[]
  total: number
  /** Total affiché : « Moins de 10 » sous le seuil d'anonymat. */
  totalLabel: string
}

const requireOwnFormation = async (actorId: string, formationId: string) => {
  const user = await requireAccount(actorId, 'etablissement')
  const formation = await db.formations.get(formationId)
  if (!formation || formation.institutionId !== user.institutionId) throw new AccessDeniedError('Cette formation n’appartient pas à votre établissement.')
  return { user, formation }
}

/**
 * Profils simplifiés des lycéens qui ont accepté d'être visibles et qui s'intéressent à la formation.
 * Aucune moyenne, note, nom de famille ni coordonnée n'est projeté. L'ordre ne dépend d'aucun résultat.
 */
export const listInterestedProfiles = async (actorId: string, formationId: string): Promise<InterestedProfilesResult> => {
  const { formation } = await requireOwnFormation(actorId, formationId)
  const shares = await db.shares.where('audience').equals('etablissements').filter((s) => s.active).toArray()
  const institution = await db.institutions.get(formation.institutionId)
  const openDayEvents = new Set((institution?.events ?? []).filter((e) => e.kind === 'Portes ouvertes').map((e) => e.id))
  const profiles: InterestedProfile[] = []
  for (const share of shares) {
    const [user, profile, favorite, comparison] = await Promise.all([
      db.users.get(share.studentId),
      db.studentProfiles.get(share.studentId),
      db.favorites.where('[userId+formationId]').equals([share.studentId, formationId]).first(),
      db.comparisons.get(share.studentId),
    ])
    if (!user || !profile || user.isGuest) continue
    if (!favorite && !comparison?.formationIds.includes(formationId)) continue
    const deadlines = await db.deadlines.where('ownerId').equals(share.studentId).toArray()
    const openDayDeadline = deadlines.find((d) => d.institutionEventId && openDayEvents.has(d.institutionEventId))
    profiles.push({
      studentId: user.id,
      firstName: user.firstName,
      classe: profile.classe.toLowerCase(),
      summary: profile.publicSummary ?? 'Profil simplifié : intérêts et spécialités uniquement.',
      specialites: profile.specialites,
      questions: profile.questions ?? 'Aucune question pour le moment',
      openDay: openDayDeadline ? (openDayDeadline.badge === 'invitation' ? 'invite' : 'inscrit') : 'aucun',
    })
  }
  // Ordre alphabétique : jamais de tri par résultats.
  profiles.sort((a, b) => a.firstName.localeCompare(b.firstName, 'fr'))
  return {
    profiles,
    total: profiles.length,
    totalLabel: profiles.length < ANONYMITY_THRESHOLD ? 'Moins de 10' : String(profiles.length),
  }
}

export const inviteToOpenDay = async (actorId: string, formationId: string, studentId: string) => {
  const { user } = await requireOwnFormation(actorId, formationId)
  const { profiles } = await listInterestedProfiles(actorId, formationId)
  if (!profiles.some((p) => p.studentId === studentId)) {
    throw new AccessDeniedError('Ce lycéen n’a pas (ou plus) rendu son profil visible : invitation impossible.')
  }
  const institution = await db.institutions.get(user.institutionId!)
  const event = institution?.events.find((e) => e.kind === 'Portes ouvertes')
  if (!institution || !event) throw new ValidationError('Annoncez d’abord une journée portes ouvertes sur la page de l’école.')
  const existing = await db.deadlines.where('ownerId').equals(studentId).filter((d) => d.institutionEventId === event.id).first()
  if (existing) return { alreadyInvited: true }
  await db.deadlines.add({
    id: newId('dl'),
    ownerId: studentId,
    date: event.date,
    title: `Portes ouvertes · ${institution.shortName}`,
    subtitle: `Invitation de ${institution.shortName}`,
    badge: 'invitation',
    institutionEventId: event.id,
    createdAt: nowIso(),
  })
  const student = await db.users.get(studentId)
  await log(user.id, user, 'invitation', `Invitation aux portes ouvertes envoyée à ${student?.firstName ?? 'un lycéen'}.`)
  await log(studentId, { ...user, firstName: institution.shortName, lastName: '', role: 'etablissement' }, 'invitation', `${institution.shortName} vous invite à ses portes ouvertes : l’échéance a été ajoutée à votre calendrier.`)
  return { alreadyInvited: false, by: displayName(user) }
}
