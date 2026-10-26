import 'fake-indexeddb/auto'
import { beforeEach } from 'vitest'
import { db } from '../../src/db/database'
import { initDatabase, resetInitCache } from '../../src/db/repositories/demoRepository'

// Base neuve et seed rechargé avant chaque test : aucun état partagé entre tests.
beforeEach(async () => {
  db.close()
  await db.delete()
  resetInitCache()
  await initDatabase()
})
