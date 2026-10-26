import { db } from '../database'
import { nowIso } from '../../lib/ids'
import { parseGrade } from '../../lib/text'
import type { CityPreference, DomainId, DurationPreference, Grades, LearningPreference, Level, StudentProfile } from '../../types'
import { ValidationError } from './errors'
import { requireUser } from './internal'

/**
 * Projections par rôle. Les moyennes (`grades`, `useGrades`) n'existent que dans la vue propriétaire.
 */
export type OwnStudentProfile = StudentProfile
export type SharedStudentProfile = Omit<StudentProfile, 'grades' | 'useGrades'>
export interface InstitutionStudentProfile {
  studentId: string
  firstName: string
  classe: string
  summary: string
  specialites: string[]
  questions: string
}

export const toSharedProfile = ({ grades: _grades, useGrades: _useGrades, ...shared }: StudentProfile): SharedStudentProfile => shared

const requireOwnProfile = async (actorId: string) => {
  await requireUser(actorId, 'lyceen')
  const profile = await db.studentProfiles.get(actorId)
  if (!profile) throw new ValidationError('Profil introuvable : reconnectez-vous pour le recréer.')
  return profile
}

/** Vue propriétaire : seul le lycéen connecté lit son propre profil, moyennes comprises. */
export const getOwnProfile = async (actorId: string): Promise<OwnStudentProfile> => requireOwnProfile(actorId)

const withStep = (steps: number[], step: number) => (steps.includes(step) ? steps : [...steps, step].sort())

export const saveInterests = async (actorId: string, interests: Partial<Record<DomainId, Level>>) => {
  const profile = await requireOwnProfile(actorId)
  for (const value of Object.values(interests)) {
    if (value !== undefined && (value < 1 || value > 5)) throw new ValidationError('Niveau d’intérêt invalide : choisissez entre « Pas du tout » et « Passionnément ».')
  }
  await db.studentProfiles.put({ ...profile, interests, completedSteps: withStep(profile.completedSteps, 1), updatedAt: nowIso() })
}

export interface PreferencesInput {
  specialites: string[]
  city?: CityPreference
  duration?: DurationPreference
  learning?: LearningPreference
  alternance: boolean
}

export type PreferenceField = 'specialites' | 'city' | 'duration' | 'learning'

export const validatePreferences = (input: PreferencesInput) => {
  const errors: Partial<Record<PreferenceField, string>> = {}
  if (input.specialites.length !== 2)
    errors.specialites =
      input.specialites.length < 2
        ? `Cochez vos deux spécialités de terminale (${input.specialites.length} cochée${input.specialites.length > 1 ? 's' : ''}).`
        : 'Cochez seulement vos deux spécialités de terminale.'
  if (!input.city) errors.city = 'Choisissez un type de ville, ou « Peu importe ».'
  if (!input.duration) errors.duration = 'Choisissez une durée d’études, ou « Je ne sais pas encore ».'
  if (!input.learning) errors.learning = 'Choisissez une façon d’apprendre.'
  return errors
}

export const savePreferences = async (actorId: string, input: PreferencesInput) => {
  const profile = await requireOwnProfile(actorId)
  const errors = validatePreferences(input)
  if (Object.keys(errors).length) throw new ValidationError<PreferenceField>('Certaines préférences manquent.', errors)
  await db.studentProfiles.put({ ...profile, ...input, completedSteps: withStep(profile.completedSteps, 2), updatedAt: nowIso() })
}

/** Saisie brute des moyennes, au format français. */
export const validateGrades = (raw: Record<string, string>) => {
  const grades: Grades = {}
  const errors: Record<string, string> = {}
  for (const [subject, value] of Object.entries(raw)) {
    if (!value.trim()) continue
    const parsed = parseGrade(value)
    if (parsed === null) errors[subject] = 'Saisissez une moyenne entre 0 et 20, par exemple 14,5.'
    else grades[subject] = parsed
  }
  return { grades, errors }
}

export const saveDossier = async (actorId: string, raw: Record<string, string>, useGrades: boolean) => {
  const profile = await requireOwnProfile(actorId)
  const { grades, errors } = validateGrades(raw)
  if (Object.keys(errors).length) throw new ValidationError('Certaines moyennes sont invalides. Vos autres saisies sont conservées.', errors)
  await db.studentProfiles.put({ ...profile, grades, useGrades, completedSteps: withStep(profile.completedSteps, 3), updatedAt: nowIso() })
}

export const skipDossier = async (actorId: string) => {
  const profile = await requireOwnProfile(actorId)
  await db.studentProfiles.put({ ...profile, completedSteps: withStep(profile.completedSteps, 3), updatedAt: nowIso() })
}

export const clearGrades = async (actorId: string) => {
  const profile = await requireOwnProfile(actorId)
  await db.studentProfiles.put({ ...profile, grades: {}, useGrades: false, updatedAt: nowIso() })
}
