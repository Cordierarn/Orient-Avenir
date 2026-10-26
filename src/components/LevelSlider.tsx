import { useId, useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { LEVELS, levelLabels } from '../data/domains'
import type { Level } from '../types'

interface LevelSliderProps {
  label: string
  value: Level | undefined
  onChange: (value: Level) => void
}

const position = (level: Level) => ((level - 1) / 4) * 100

/**
 * Curseur à 5 niveaux (Pas du tout → Passionnément) :
 * souris, toucher (clic ou glissé sur la barre), clavier (flèches, Début, Fin) et lecteur d'écran (role="slider").
 */
export const LevelSlider = ({ label, value, onChange }: LevelSliderProps) => {
  const labelId = useId()
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const levelFromPointer = (clientX: number): Level => {
    const rect = trackRef.current!.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    return (Math.round(ratio * 4) + 1) as Level
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragging.current = true
    event.currentTarget.setPointerCapture?.(event.pointerId)
    onChange(levelFromPointer(event.clientX))
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    const next = levelFromPointer(event.clientX)
    if (next !== value) onChange(next)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = value ?? 0
    let next: number | null = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = Math.min(5, current + 1)
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = Math.max(1, current - 1)
    if (event.key === 'Home') next = 1
    if (event.key === 'End') next = 5
    if (event.key === 'PageUp') next = Math.min(5, current + 2)
    if (event.key === 'PageDown') next = Math.max(1, current - 2)
    if (next !== null) {
      event.preventDefault()
      if (next >= 1) onChange(next as Level)
    }
  }

  return (
    <div className="level-row">
      <span id={labelId}>{label}</span>
      <div
        ref={trackRef}
        className={`level-slider ${value ? '' : 'level-unset'}`}
        role="slider"
        tabIndex={0}
        aria-labelledby={labelId}
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={value ?? undefined}
        aria-valuetext={value ? levelLabels[value] : 'Non renseigné'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          dragging.current = false
        }}
        onPointerCancel={() => {
          dragging.current = false
        }}
        onKeyDown={onKeyDown}
      >
        <span className="level-track" aria-hidden="true" />
        <span className="level-fill" style={{ width: `${value ? position(value) : 0}%` }} aria-hidden="true" />
        <span className="level-thumb" style={{ left: `${value ? position(value) : 0}%` }} aria-hidden="true" />
      </div>
      <span className="level-value" aria-hidden="true">
        {value ? levelLabels[value] : 'À renseigner'}
      </span>
    </div>
  )
}

export { LEVELS }
