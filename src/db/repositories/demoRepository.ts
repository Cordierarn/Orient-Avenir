import type { Table } from 'dexie'
import { db } from '../database'
import { SEED_VERSION, seedData, seedFormationIds, seedInstitutionIds, seedUserIds } from '../seed'
import { log, requireUser } from './internal'

const SEED_KEY = 'seedVersion'

/** Ajoute uniquement les enregistrements absents (migration non destructive). */
const addMissing = async <T>(table: Table<T, string>, rows: T[]) => {
  const keyPath = table.schema.primKey.keyPath as string
  const keys = rows.map((row) => (row as Record<string, string>)[keyPath])
  const existing = await table.bulkGet(keys)
  const missing = rows.filter((_, i) => existing[i] === undefined)
  if (missing.length) await table.bulkAdd(missing)
}

const seedTables = () =>
  [
    [db.users, seedData.users],
    [db.studentProfiles, seedData.studentProfiles],
    [db.counselorProfiles, seedData.counselorProfiles],
    [db.institutions, seedData.institutions],
    [db.formations, seedData.formations],
    [db.favorites, seedData.favorites],
    [db.comparisons, seedData.comparisons],
    [db.shares, seedData.shares],
    [db.appointmentRequests, seedData.appointmentRequests],
    [db.appointments, seedData.appointments],
    [db.counselorNotes, seedData.counselorNotes],
    [db.deadlines, seedData.deadlines],
    [db.reminders, seedData.reminders],
    [db.activityLog, seedData.activityLog],
  ] as Array<[Table<unknown, string>, unknown[]]>

let initPromise: Promise<void> | null = null

/**
 * Charge le seed au premier lancement, puis applique les migrations de seed
 * (ajout des seuls enregistrements manquants) quand SEED_VERSION augmente.
 */
export const initDatabase = () => {
  initPromise ??= (async () => {
    await db.open()
    await db.transaction('rw', db.tables, async () => {
      const current = await db.meta.get(SEED_KEY)
      const version = typeof current?.value === 'number' ? current.value : 0
      if (version >= SEED_VERSION) return
      for (const [table, rows] of seedTables()) await addMissing(table, rows)
      await db.meta.put({ key: SEED_KEY, value: SEED_VERSION })
    })
  })().catch((error) => {
    initPromise = null
    throw error
  })
  return initPromise
}

/** Réservé aux tests : réinitialise le cache d'initialisation. */
export const resetInitCache = () => {
  initPromise = null
}

export const getSeedVersion = async () => {
  const entry = await db.meta.get(SEED_KEY)
  return typeof entry?.value === 'number' ? entry.value : 0
}

/**
 * Réinitialise les données de démonstration : supprime les modifications locales liées au seed
 * (comptes, formations, établissements de démonstration et leurs échanges), puis recrée le seed.
 * Les comptes créés dans ce navigateur sont conservés, avec leurs propres données.
 */
export const resetDemoData = async (actorId: string) => {
  const actor = await requireUser(actorId)
  const isSeedUser = (id: string | null | undefined) => Boolean(id && seedUserIds.has(id))

  await db.transaction('rw', db.tables, async () => {
    await db.users.bulkDelete([...seedUserIds])
    await db.studentProfiles.bulkDelete([...seedUserIds])
    await db.counselorProfiles.bulkDelete([...seedUserIds])
    await db.reminders.bulkDelete([...seedUserIds])
    await db.comparisons.bulkDelete([...seedUserIds])
    await db.institutions.bulkDelete([...seedInstitutionIds])
    await db.formations.filter((f) => seedFormationIds.has(f.id) || seedInstitutionIds.has(f.institutionId)).delete()
    await db.favorites.filter((f) => isSeedUser(f.userId)).delete()
    await db.shares.filter((s) => isSeedUser(s.studentId)).delete()
    await db.appointmentRequests
      .filter((r) => isSeedUser(r.studentId) || isSeedUser(r.preferredCounselorId) || isSeedUser(r.acceptedBy))
      .delete()
    await db.appointments.filter((a) => isSeedUser(a.studentId) || isSeedUser(a.counselorId)).delete()
    await db.messages.filter((m) => isSeedUser(m.senderId) || isSeedUser(m.recipientId)).delete()
    await db.counselorNotes.filter((n) => isSeedUser(n.counselorId) || isSeedUser(n.studentId)).delete()
    await db.deadlines.filter((d) => d.ownerId === null || isSeedUser(d.ownerId)).delete()
    await db.activityLog.filter((a) => isSeedUser(a.userId)).delete()

    for (const [table, rows] of seedTables()) await table.bulkPut(rows)

    // Données des autres comptes qui pointaient vers des formations supprimées.
    const formationIds = new Set((await db.formations.toArray()).map((f) => f.id))
    await db.favorites.filter((f) => !formationIds.has(f.formationId)).delete()
    const comparisons = await db.comparisons.toArray()
    for (const comparison of comparisons) {
      const kept = comparison.formationIds.filter((id) => formationIds.has(id))
      if (kept.length !== comparison.formationIds.length) await db.comparisons.put({ ...comparison, formationIds: kept })
    }
    await db.meta.put({ key: SEED_KEY, value: SEED_VERSION })
  })

  await log(actor.id, actor, 'reinitialisation', 'Données de démonstration réinitialisées.')
}
