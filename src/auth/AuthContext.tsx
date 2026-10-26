import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authRepo, demoRepo } from '../db/repositories'
import type { RegistrationInput } from '../db/repositories/authRepository'
import { useToast } from '../components/Toast'
import { useRepo } from '../hooks/useRepo'
import { shortName } from '../lib/text'
import type { PublicUser } from '../types'
import { clearSessionId, readGuestId, readSessionId, rememberAccount, writeGuestId, writeSessionId } from './storage'

type BootState = 'loading' | 'ready' | 'error'

interface AuthContextValue {
  boot: BootState
  bootError: unknown
  /** true tant que le compte de la session n'est pas encore lu. */
  pending: boolean
  user: PublicUser | null
  sessionId: string | null
  login: (email: string, password: string, remember: boolean) => Promise<PublicUser>
  loginDemo: (userId: string, remember?: boolean) => Promise<PublicUser>
  register: (input: RegistrationInput) => Promise<PublicUser>
  enterGuest: () => Promise<PublicUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [boot, setBoot] = useState<BootState>('loading')
  const [bootError, setBootError] = useState<unknown>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await demoRepo.initDatabase()
        const stored = readSessionId()
        const user = stored ? await authRepo.resolveSession(stored) : null
        if (cancelled) return
        if (stored && !user) clearSessionId()
        setSessionId(user ? stored : null)
        setBoot('ready')
      } catch (error) {
        if (cancelled) return
        setBootError(error)
        setBoot('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Compte réactif : reflète immédiatement un changement (rattachement, réinitialisation…).
  // Le résultat porte la session interrogée : jamais de compte périmé après un changement de session.
  const { data: live } = useRepo(
    async () => ({ sessionId, user: sessionId ? await authRepo.peekSession(sessionId) : null }),
    [sessionId],
  )
  const fresh = live?.sessionId === sessionId
  const user = sessionId && fresh ? (live?.user ?? null) : null
  const pending = boot === 'loading' || (sessionId !== null && !fresh)

  const open = useCallback(async (account: PublicUser, persistent: boolean) => {
    const session = await authRepo.createSession(account.id, persistent)
    writeSessionId(session.id, persistent)
    if (!account.isGuest) {
      rememberAccount({
        userId: account.id,
        name: account.role === 'etablissement' ? `${account.firstName} ${account.lastName}` : shortName(account.firstName, account.lastName),
        email: account.email,
        role: account.role,
        isDemo: account.isDemo,
      })
    }
    setSessionId(session.id)
    return account
  }, [])

  const { clear: clearToasts } = useToast()
  const closeCurrent = useCallback(async () => {
    clearToasts()
    const current = readSessionId()
    if (current) await authRepo.logout(current)
    clearSessionId()
  }, [clearToasts])

  const value = useMemo<AuthContextValue>(
    () => ({
      boot,
      bootError,
      pending,
      user,
      sessionId,
      login: async (email, password, remember) => {
        const account = await authRepo.login(email, password)
        await closeCurrent()
        return open(account, remember)
      },
      loginDemo: async (userId, remember = true) => {
        const account = await authRepo.loginDemo(userId)
        await closeCurrent()
        return open(account, remember)
      },
      register: async (input) => {
        const account = await authRepo.register(input)
        await closeCurrent()
        return open(account, false)
      },
      enterGuest: async () => {
        const guest = await authRepo.getOrCreateGuest(readGuestId())
        writeGuestId(guest.id)
        await closeCurrent()
        return open(guest, false)
      },
      logout: async () => {
        await closeCurrent()
        setSessionId(null)
      },
    }),
    [boot, bootError, pending, user, sessionId, open, closeCurrent],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return context
}

/** Compte connecté, garanti par les routes protégées. */
// eslint-disable-next-line react/only-export-components
export const useCurrentUser = () => {
  const { user } = useAuth()
  if (!user) throw new Error('Aucun compte connecté')
  return user
}
