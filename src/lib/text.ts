/** Minuscules, sans accents ni espaces superflus : sert à la recherche plein texte. */
export const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

export const normalizeEmail = (value: string) => value.trim().toLowerCase()

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const isValidEmail = (value: string) => EMAIL_PATTERN.test(normalizeEmail(value))

export const initials = (firstName: string, lastName = '') =>
  `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase()

/** « Léa D. » : prénom et initiale du nom. */
export const shortName = (firstName: string, lastName = '') =>
  lastName ? `${firstName} ${lastName.trim().charAt(0).toUpperCase()}.` : firstName

/** Nombre au format français : 1 240, 14,5. */
export const formatNumber = (value: number) => new Intl.NumberFormat('fr-FR').format(value)

/** Lit une moyenne saisie en français (« 14,5 »). Retourne null si invalide. */
export const parseGrade = (raw: string): number | null => {
  const cleaned = raw.trim().replace(',', '.')
  if (!cleaned) return null
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(cleaned)) return null
  const value = Number(cleaned)
  return value >= 0 && value <= 20 ? value : null
}

export const formatGrade = (value: number | undefined) =>
  value === undefined ? '' : String(value).replace('.', ',')

export const plural = (count: number, singular: string, pluralForm = `${singular}s`) =>
  `${count} ${count > 1 ? pluralForm : singular}`

/** Seuil d'anonymat : toute valeur strictement inférieure à 10 est masquée. */
export const ANONYMITY_THRESHOLD = 10

export const maskSmall = (value: number) => (value < ANONYMITY_THRESHOLD ? 'Moins de 10' : formatNumber(value))
