import type { Domain, DomainId, Level } from '../types'

export const domains: Domain[] = [
  { id: 'numerique', label: 'Numérique et code', short: 'numérique' },
  { id: 'sciences', label: 'Sciences et expérimentation', short: 'sciences' },
  { id: 'concevoir', label: 'Concevoir et fabriquer', short: 'concevoir et fabriquer' },
  { id: 'sante', label: 'Santé et soin', short: 'santé' },
  { id: 'social', label: 'Social, droit, éducation', short: 'social' },
  { id: 'gestion', label: 'Gestion et commerce', short: 'gestion' },
  { id: 'creation', label: 'Création, design, communication', short: 'création' },
  { id: 'langues', label: 'Langues et cultures', short: 'langues' },
  { id: 'environnement', label: 'Environnement et territoires', short: 'environnement' },
]

/** Libellés courts utilisés dans les pastilles « Vos intérêts forts ». */
export const domainChipLabels: Record<DomainId, string> = {
  numerique: 'Numérique et code',
  sciences: 'Sciences',
  concevoir: 'Concevoir et fabriquer',
  sante: 'Santé et soin',
  social: 'Social, droit',
  gestion: 'Gestion et commerce',
  creation: 'Création, design',
  langues: 'Langues et cultures',
  environnement: 'Environnement',
}

export const domainLabel = (id: DomainId) => domains.find((d) => d.id === id)?.label ?? id

export const levelLabels: Record<Level, string> = {
  1: 'Pas du tout',
  2: 'Un peu',
  3: 'Moyennement',
  4: 'Beaucoup',
  5: 'Passionnément',
}

export const LEVELS: Level[] = [1, 2, 3, 4, 5]

export const specialites = [
  'Mathématiques',
  'NSI',
  'Physique-chimie',
  'SVT',
  'SES',
  'HGGSP',
  'LLCER',
  'Arts plastiques',
]

export const cityLabels = {
  grande: 'Grande ville',
  moyenne: 'Ville moyenne',
  petite: 'Petite ville',
  indifferent: 'Peu importe',
} as const

export const durationLabels = {
  '2': '2 ans',
  '3': '3 ans',
  '5+': '5 ans ou plus',
  inconnu: 'Je ne sais pas encore',
} as const

export const learningLabels = {
  pratique: 'Plutôt pratique',
  equilibree: 'Équilibrée',
  theorique: 'Plutôt théorique',
} as const

/** Domaines les plus forts d'un profil (niveau ≥ Beaucoup, sinon les deux premiers). */
export const strongDomains = (interests: Partial<Record<DomainId, Level>>, min: Level = 4) => {
  const sorted = domains
    .filter((d) => interests[d.id] !== undefined)
    .sort((a, b) => (interests[b.id] ?? 0) - (interests[a.id] ?? 0))
  const strong = sorted.filter((d) => (interests[d.id] ?? 0) >= min)
  return strong.length ? strong : sorted.slice(0, 2)
}
