import type { Role } from '../types'

/**
 * Stockage navigateur de la session : uniquement l'identifiant de session,
 * jamais de mot de passe ni de donnée de profil.
 */
const SESSION_KEY = 'orient-avenir.session'
const RECENT_KEY = 'orient-avenir.recent'
const GUEST_KEY = 'orient-avenir.guest'

const safe = <T>(fn: () => T, fallback: T): T => {
  try {
    return fn()
  } catch {
    return fallback
  }
}

export const readSessionId = () =>
  safe(() => localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY), null)

/** « Rester connecté » : localStorage ; sinon sessionStorage (effacé à la fermeture du navigateur). */
export const writeSessionId = (sessionId: string, persistent: boolean) =>
  safe(() => {
    clearSessionId()
    ;(persistent ? localStorage : sessionStorage).setItem(SESSION_KEY, sessionId)
  }, undefined)

export const clearSessionId = () =>
  safe(() => {
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
  }, undefined)

export interface RecentAccount {
  userId: string
  name: string
  email: string
  role: Role
  isDemo: boolean
  lastUsedAt: string
}

export const readRecentAccounts = (): RecentAccount[] =>
  safe(() => JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as RecentAccount[], [])

export const rememberAccount = (account: Omit<RecentAccount, 'lastUsedAt'>) =>
  safe(() => {
    const others = readRecentAccounts().filter((a) => a.userId !== account.userId)
    const next = [{ ...account, lastUsedAt: new Date().toISOString() }, ...others].slice(0, 5)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  }, undefined)

export const readGuestId = () => safe(() => localStorage.getItem(GUEST_KEY), null)
export const writeGuestId = (id: string) => safe(() => localStorage.setItem(GUEST_KEY, id), undefined)
