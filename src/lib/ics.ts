import type { Deadline } from '../types'

const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
const day = (iso: string) => iso.slice(0, 10).replace(/-/g, '')
const nextDay = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + 1))
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}

/** Fichier iCalendar des échéances, généré localement (aucun envoi). */
export const deadlinesToIcs = (deadlines: Deadline[]) =>
  [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Orient’Avenir//Prototype//FR',
    ...deadlines.flatMap((d) => [
      'BEGIN:VEVENT',
      `UID:${d.id}@orient-avenir.local`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
      `DTSTART;VALUE=DATE:${day(d.date)}`,
      `DTEND;VALUE=DATE:${nextDay(d.endDate ?? d.date)}`,
      `SUMMARY:${escape(d.title)}`,
      `DESCRIPTION:${escape(`${d.subtitle} — dates fictives, démarches sur la plateforme officielle.`)}`,
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ].join('\r\n')

export const downloadFile = (name: string, content: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
