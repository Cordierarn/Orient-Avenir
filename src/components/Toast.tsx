import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type ToastKind = 'success' | 'info' | 'error'

interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

interface ToastContextValue {
  notify: (message: string, kind?: ToastKind) => void
  /** Vide les notifications : appelé à chaque changement de session pour ne rien montrer d'un autre compte. */
  clear: () => void
}

const ToastContext = createContext<ToastContextValue>({ notify: () => undefined, clear: () => undefined })

/** Durée d'affichage : 7 s, suspendue au survol ou au focus. Les erreurs restent jusqu'à fermeture. */
const DURATION = 7000

const icons = { success: CheckCircle2, info: Info, error: AlertTriangle }

const ToastView = ({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) => {
  const [paused, setPaused] = useState(false)
  const remaining = useRef(DURATION)
  const startedAt = useRef(0)

  useEffect(() => {
    if (toast.kind === 'error' || paused) return
    startedAt.current = Date.now()
    const timer = window.setTimeout(() => onDismiss(toast.id), remaining.current)
    return () => {
      window.clearTimeout(timer)
      remaining.current -= Date.now() - startedAt.current
    }
  }, [paused, toast, onDismiss])

  const Icon = icons[toast.kind]
  return (
    <div
      className={`toast toast--${toast.kind}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon className="toast-kind" size={20} aria-hidden="true" />
      <p className="small">
        <span className="visually-hidden">{toast.kind === 'error' ? 'Erreur : ' : toast.kind === 'success' ? 'Confirmation : ' : 'Information : '}</span>
        {toast.message}
      </p>
      <button type="button" className="toast-close" onClick={() => onDismiss(toast.id)} aria-label="Fermer la notification">
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )
}

/**
 * Notifications annoncées aux lecteurs d'écran (région aria-live polie, assertive pour les erreurs).
 * Elles complètent toujours une trace visible dans la page ou l'historique.
 */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((t) => t.id !== id)), [])
  const notify = useCallback((message: string, kind: ToastKind = 'success') => {
    counter.current += 1
    const id = counter.current
    setToasts((current) => [...current.slice(-2), { id, kind, message }])
  }, [])

  const clear = useCallback(() => setToasts([]), [])
  const value = useMemo(() => ({ notify, clear }), [notify, clear])
  const polite = toasts.filter((t) => t.kind !== 'error')
  const assertive = toasts.filter((t) => t.kind === 'error')

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
      <div className="toast-region">
        <div aria-live="polite" role="status" className="stack-sm">
          {polite.map((toast) => (
            <ToastView key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </div>
        <div aria-live="assertive" role="alert" className="stack-sm">
          {assertive.map((toast) => (
            <ToastView key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </div>
      </div>,
      document.body,
      )}
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components
export const useToast = () => useContext(ToastContext)
