import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useRef, useState } from 'react'

export interface RepoResult<T> {
  data: T | undefined
  error: unknown
  loading: boolean
}

/**
 * Lecture réactive via un repository : la vue se met à jour dès que les données changent
 * (dans cet onglet comme dans les autres). Les erreurs sont renvoyées, jamais levées au rendu.
 */
export const useRepo = <T>(query: () => Promise<T>, deps: unknown[]): RepoResult<T> => {
  const result = useLiveQuery(
    async () => {
      try {
        return { ok: true as const, value: await query() }
      } catch (error) {
        return { ok: false as const, error }
      }
    },
    deps,
  )
  if (!result) return { data: undefined, error: null, loading: true }
  return result.ok ? { data: result.value, error: null, loading: false } : { data: undefined, error: result.error, loading: false }
}

/**
 * Action asynchrone avec état de chargement et protection contre les doubles soumissions.
 */
export const useAction = <A extends unknown[], R>(action: (...args: A) => Promise<R>) => {
  const [pending, setPending] = useState(false)
  const running = useRef(false)
  const actionRef = useRef(action)
  actionRef.current = action
  const run = useCallback(async (...args: A): Promise<R | undefined> => {
    if (running.current) return undefined
    running.current = true
    setPending(true)
    try {
      return await actionRef.current(...args)
    } finally {
      running.current = false
      setPending(false)
    }
  }, [])
  return { run, pending }
}
