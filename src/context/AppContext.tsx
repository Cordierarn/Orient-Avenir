import { createContext, useContext, useMemo, useState } from 'react'
import type { AppState, DomainId, Role } from '../types'

const STORAGE_KEY = 'orient-avenir-demo'

const defaultInterests: Record<DomainId, number> = {
  numerique: 2,
  sciences: 2,
  concevoir: 1,
  sante: 1,
  social: 1,
  gestion: 1,
  creation: 1,
  langues: 1,
  environnement: 1,
}

const defaultState: AppState = {
  role: 'lyceen',
  student: {
    interests: defaultInterests,
    specialites: ['Maths', 'NSI'],
    cityPreference: 'indifferent',
    durationPreference: 'indifferent',
    learningStyle: 'equilibre',
    alternancePreference: 'indifferent',
    moyennes: {},
    useGradesForRepere: false,
  },
  favorites: {},
  compareIds: [],
  shareWithCounselor: false,
  visibleToSchools: false,
  remindersEnabled: true,
  selectedOpenDays: [],
  liveMessage: '',
  messages: [
    {
      id: '1',
      from: 'conseiller',
      text: 'Bonjour Léa, on peut préparer votre comparaison de formations ensemble.',
      at: '09:12',
    },
  ],
}

const safeRead = (): AppState => {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return defaultState
    return { ...defaultState, ...JSON.parse(data) }
  } catch {
    return defaultState
  }
}

interface ContextValue {
  state: AppState
  setRole: (role: Role) => void
  updateState: (updater: (current: AppState) => AppState) => void
  setLiveMessage: (message: string) => void
  resetDemo: () => void
}

const AppContext = createContext<ContextValue | undefined>(undefined)

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AppState>(safeRead)

  const updateState = (updater: (current: AppState) => AppState) => {
    setState((current) => {
      const next = updater(current)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // no-op when storage unavailable
      }
      return next
    })
  }

  const value = useMemo<ContextValue>(
    () => ({
      state,
      setRole: (role) => updateState((current) => ({ ...current, role })),
      updateState,
      setLiveMessage: (message) => updateState((current) => ({ ...current, liveMessage: message })),
      resetDemo: () => {
        try {
          localStorage.removeItem(STORAGE_KEY)
        } catch {
          // no-op
        }
        setState(defaultState)
      },
    }),
    [state],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp doit être utilisé dans AppProvider')
  }
  return context
}
