import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface ModalProps {
  open: boolean
  title: ReactNode
  /** Sur-titre au-dessus du titre (catégorie). */
  overline?: ReactNode
  description?: ReactNode
  onClose: () => void
  children?: ReactNode
  footer?: ReactNode
  size?: 'default' | 'wide'
  /** Plein écran sous 720 px (fiche formation). */
  fullscreenOnMobile?: boolean
  closeLabel?: string
  /** Élément qui reçoit le focus à l'ouverture (sinon le premier élément focalisable). */
  initialFocusRef?: React.RefObject<HTMLElement | null>
  hideCloseButton?: boolean
}

let openCount = 0

/**
 * Fenêtre modale accessible : focus initial, focus piégé, Échap, bouton de fermeture explicite,
 * restitution du focus à l'élément déclencheur, titre et description reliés, défilement de l'arrière-plan bloqué.
 */
export const Modal = ({
  open,
  title,
  overline,
  description,
  onClose,
  children,
  footer,
  size = 'default',
  fullscreenOnMobile,
  closeLabel = 'Fermer',
  initialFocusRef,
  hideCloseButton,
}: ModalProps) => {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const trigger = document.activeElement as HTMLElement | null
    openCount += 1
    document.body.classList.add('scroll-locked')
    const root = document.getElementById('root')
    root?.setAttribute('aria-hidden', 'true')
    root?.setAttribute('inert', '')

    const dialog = dialogRef.current!
    const target = initialFocusRef?.current ?? dialog.querySelector<HTMLElement>('[data-autofocus]') ?? dialog.querySelector<HTMLElement>(FOCUSABLE)
    ;(target ?? dialog).focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement)
      if (!focusables.length) {
        event.preventDefault()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      openCount -= 1
      if (openCount === 0) {
        document.body.classList.remove('scroll-locked')
        root?.removeAttribute('aria-hidden')
        root?.removeAttribute('inert')
      }
      if (trigger && document.contains(trigger)) trigger.focus()
    }
  }, [open, initialFocusRef])

  if (!open) return null

  return createPortal(
    <div
      className="modal-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className={`modal ${size === 'wide' ? 'modal-wide' : ''} ${fullscreenOnMobile ? 'modal-fullscreen-mobile' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <div className="modal-header">
          <div className="stack-sm" style={{ gap: 4 }}>
            {overline ? <p className="overline accent">{overline}</p> : null}
            <h2 id={titleId} className="h1">
              {title}
            </h2>
            {description ? (
              <div id={descriptionId} className="muted small">
                {description}
              </div>
            ) : null}
          </div>
          {hideCloseButton ? null : (
            <button type="button" className="btn btn-secondary btn-icon" onClick={onClose} aria-label={closeLabel} title={closeLabel}>
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>
        {children}
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
