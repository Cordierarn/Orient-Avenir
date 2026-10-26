const FR = 'fr-FR'

const asDate = (value: string | Date) => (typeof value === 'string' ? new Date(value) : value)

/** 24/10/2026 */
export const formatDate = (value: string | Date) =>
  asDate(value).toLocaleDateString(FR, { day: '2-digit', month: '2-digit', year: 'numeric' })

/** 18/10 */
export const formatDayMonth = (value: string | Date) =>
  asDate(value).toLocaleDateString(FR, { day: '2-digit', month: '2-digit' })

/** 6 févr. */
export const formatShortDate = (value: string | Date) =>
  asDate(value).toLocaleDateString(FR, { day: 'numeric', month: 'short' }).replace(/^1 /, '1er ')

/** samedi 6 février 2027 */
export const formatLongDate = (value: string | Date) =>
  asDate(value).toLocaleDateString(FR, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

/** 17 h, 18 h 02 */
export const formatHour = (value: string | Date) => {
  const date = asDate(value)
  const minutes = date.getMinutes()
  return minutes ? `${date.getHours()} h ${String(minutes).padStart(2, '0')}` : `${date.getHours()} h`
}

/** jeudi 29/10/2026 à 17 h */
export const formatSlot = (value: string | Date) => {
  const date = asDate(value)
  const weekday = date.toLocaleDateString(FR, { weekday: 'long' })
  return `${weekday} ${formatDate(date)} à ${formatHour(date)}`
}

/** Jeu. 29 oct. · 17 h */
export const formatSlotShort = (value: string | Date) => {
  const date = asDate(value)
  const weekday = date.toLocaleDateString(FR, { weekday: 'short' })
  const label = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date.toLocaleDateString(FR, { day: 'numeric', month: 'short' })}`
  return `${label} · ${formatHour(date)}`
}

/** Lun. 2 nov. */
export const formatWeekdayShort = (value: string | Date) => {
  const date = asDate(value)
  const weekday = date.toLocaleDateString(FR, { weekday: 'short' })
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date.toLocaleDateString(FR, { day: 'numeric', month: 'short' })}`
}

/** 24/10/2026 à 14 h 05 */
export const formatDateTime = (value: string | Date) => `${formatDate(value)} à ${formatHour(value)}`

export const toIsoDay = (value: Date) => {
  const y = value.getFullYear()
  const m = String(value.getMonth() + 1).padStart(2, '0')
  const d = String(value.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Date locale à minuit à partir de AAAA-MM-JJ. */
export const fromIsoDay = (value: string) => {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const daysBetween = (from: Date, to: Date) => {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime()
  return Math.round((b - a) / 86_400_000)
}

/** Lundi suivant la date donnée (ou la date si c'est déjà un lundi après aujourd'hui). */
export const nextMonday = (from: Date) => {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const offset = (8 - date.getDay()) % 7 || 7
  date.setDate(date.getDate() + offset)
  return date
}

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
