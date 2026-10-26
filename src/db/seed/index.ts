import { seedActivity, seedAppointments, seedComparisons, seedCounselorNotes, seedDeadlines, seedFavorites, seedReminders, seedRequests, seedShares } from './activity'
import { seedCounselorProfiles, seedStudentProfiles, seedUsers } from './accounts'
import { seedFormations } from './formations'
import { seedInstitutions } from './institutions'

/**
 * Version du jeu de données initial. L'incrémenter quand le seed change :
 * au prochain lancement, les enregistrements manquants sont ajoutés sans écraser les données locales.
 */
export const SEED_VERSION = 1

export const seedData = {
  users: seedUsers,
  studentProfiles: seedStudentProfiles,
  counselorProfiles: seedCounselorProfiles,
  institutions: seedInstitutions,
  formations: seedFormations,
  favorites: seedFavorites,
  comparisons: seedComparisons,
  shares: seedShares,
  appointmentRequests: seedRequests,
  appointments: seedAppointments,
  counselorNotes: seedCounselorNotes,
  deadlines: seedDeadlines,
  reminders: seedReminders,
  activityLog: seedActivity,
}

export const seedUserIds = new Set(seedUsers.map((u) => u.id))
export const seedInstitutionIds = new Set(seedInstitutions.map((i) => i.id))
export const seedFormationIds = new Set(seedFormations.map((f) => f.id))

export { DEMO_IDS } from './accounts'
