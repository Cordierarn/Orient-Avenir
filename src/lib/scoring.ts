import { cityLabels, domainLabel, domains, durationLabels, learningLabels, levelLabels } from '../data/domains'
import type { DomainId, Formation, FormationScore, FormationView, ScoreComponent, StudentProfile } from '../types'

/**
 * Affinité = 0,5 × intérêts + 0,3 × spécialités + 0,2 × préférences, chaque composante sur 5.
 * C'est un repère de discussion : jamais une chance d'admission ni une décision.
 */
export const WEIGHTS = { interests: 0.5, specialites: 0.3, preferences: 0.2 } as const

/** Valeur neutre utilisée quand une composante n'est pas renseignée. */
export const NEUTRAL = 2.5

export type ScoringProfile = Pick<StudentProfile, 'interests' | 'specialites' | 'city' | 'duration' | 'learning' | 'alternance'>
export type ScoringFormation = Pick<
  Formation,
  'id' | 'domainWeights' | 'specialites' | 'durationYears' | 'practicePercent' | 'alternance' | 'title' | 'tags'
> & { institution: Pick<FormationView['institution'], 'citySize' | 'city'> }

export const clamp = (value: number, min = 0, max = 5) => (Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min)

const round1 = (value: number) => Math.round(value * 10) / 10

const dominantDomain = (formation: Pick<Formation, 'domainWeights'>): DomainId | null => {
  let best: DomainId | null = null
  let bestWeight = 0
  for (const d of domains) {
    const w = formation.domainWeights[d.id] ?? 0
    if (w > bestWeight) {
      best = d.id
      bestWeight = w
    }
  }
  return best
}

export const scoreInterests = (formation: ScoringFormation, profile: ScoringProfile): ScoreComponent => {
  let weighted = 0
  let totalWeight = 0
  let best: { id: DomainId; contribution: number } | null = null
  for (const d of domains) {
    const weight = formation.domainWeights[d.id] ?? 0
    const level = profile.interests[d.id]
    if (!weight || level === undefined) continue
    const normalized = (level - 1) / 4
    weighted += weight * normalized
    totalWeight += weight
    const contribution = weight * normalized
    if (!best || contribution > best.contribution) best = { id: d.id, contribution }
  }
  if (!totalWeight) {
    return { value: NEUTRAL, missing: true, explanation: 'Intérêts non renseignés : valeur neutre utilisée.' }
  }
  const value = clamp((weighted / totalWeight) * 5)
  const top = best ?? { id: dominantDomain(formation) ?? 'numerique' }
  const level = profile.interests[top.id]
  return {
    value,
    missing: false,
    explanation: level ? `${domainLabel(top.id)} : « ${levelLabels[level]} ».` : `${domainLabel(top.id)}.`,
  }
}

const listJoin = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items.at(-1)}`)

export const scoreSpecialites = (formation: ScoringFormation, profile: ScoringProfile): ScoreComponent => {
  if (!profile.specialites.length) {
    return { value: NEUTRAL, missing: true, explanation: 'Spécialités non renseignées : valeur neutre utilisée.' }
  }
  if (!formation.specialites.length) {
    return { value: NEUTRAL, missing: false, explanation: 'Formation ouverte à toutes les spécialités.' }
  }
  const matches = profile.specialites.filter((s) => formation.specialites.includes(s))
  const expected = Math.min(2, formation.specialites.length)
  const value = clamp((Math.min(matches.length, expected) / expected) * 5)
  const explanation = matches.length
    ? `${listJoin(matches)} ${matches.length > 1 ? 'sont conseillées' : 'est conseillée'}.`
    : `Spécialités conseillées : ${listJoin(formation.specialites.slice(0, 2))}.`
  return { value, missing: false, explanation }
}

const cityMatch = (wanted: StudentProfile['city'], actual: ScoringFormation['institution']['citySize']) => {
  if (!wanted || wanted === 'indifferent') return 1
  if (wanted === actual) return 1
  return wanted === 'moyenne' || actual === 'moyenne' ? 0.5 : 0
}

const durationMatch = (wanted: StudentProfile['duration'], years: number) => {
  if (!wanted || wanted === 'inconnu') return 1
  const target = wanted === '5+' ? 5 : Number(wanted)
  if (wanted === '5+' ? years >= 5 : years === target) return 1
  return Math.abs(years - target) <= 1 ? 0.5 : 0
}

const learningMatch = (wanted: StudentProfile['learning'], practice: number) => {
  if (!wanted) return 1
  if (wanted === 'pratique') return practice >= 55 ? 1 : practice >= 40 ? 0.5 : 0
  if (wanted === 'theorique') return practice <= 35 ? 1 : practice <= 50 ? 0.5 : 0
  return practice >= 35 && practice <= 60 ? 1 : 0.5
}

export const scorePreferences = (formation: ScoringFormation, profile: ScoringProfile): ScoreComponent => {
  const answered = [profile.city, profile.duration, profile.learning].filter(Boolean).length
  if (!answered && !profile.alternance) {
    return { value: NEUTRAL, missing: true, explanation: 'Préférences non renseignées : valeur neutre utilisée.' }
  }
  const city = cityMatch(profile.city, formation.institution.citySize)
  const duration = durationMatch(profile.duration, formation.durationYears)
  const learning = learningMatch(profile.learning, formation.practicePercent)
  const alternance = profile.alternance ? (formation.alternance ? 1 : 0) : 1
  const value = clamp(((city + duration + learning + alternance) / 4) * 5)

  const matched: string[] = []
  const missed: string[] = []
  const cityText = { grande: 'grande ville', moyenne: 'ville moyenne', petite: 'petite ville' }[formation.institution.citySize]
  if (profile.city && profile.city !== 'indifferent') (city === 1 ? matched : missed).push(cityText)
  if (profile.duration && profile.duration !== 'inconnu') (duration === 1 ? matched : missed).push(`${formation.durationYears} ans`)
  if (profile.alternance) (alternance ? matched : missed).push(formation.alternance ? 'alternance possible' : 'sans alternance')
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  let explanation: string
  if (missed.length) explanation = `${capitalize(listJoin(missed))} : hors de vos choix.`
  else if (matched.length) explanation = `${capitalize(matched.join(', '))}.`
  else explanation = 'Compatible avec vos préférences.'
  return { value, missing: false, explanation }
}

/** Parts entières dont la somme vaut exactement 100 (méthode du plus fort reste). */
export const toPercentages = (values: number[]) => {
  // Score nul : parts égales, pour rester lisible.
  const safe = values.reduce((a, b) => a + b, 0) > 0 ? values : values.map(() => 1)
  const total = safe.reduce((a, b) => a + b, 0)
  const raw = safe.map((v) => (v / total) * 100)
  const floors = raw.map(Math.floor)
  let remainder = 100 - floors.reduce((a, b) => a + b, 0)
  const order = raw.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac || a.i - b.i)
  for (const { i } of order) {
    if (remainder <= 0) break
    floors[i] += 1
    remainder -= 1
  }
  return floors
}

export const scoreFormation = (formation: ScoringFormation, profile: ScoringProfile): FormationScore => {
  const interests = scoreInterests(formation, profile)
  const specialites = scoreSpecialites(formation, profile)
  const preferences = scorePreferences(formation, profile)
  const contributions = [
    WEIGHTS.interests * interests.value,
    WEIGHTS.specialites * specialites.value,
    WEIGHTS.preferences * preferences.value,
  ]
  const score = round1(clamp(contributions.reduce((a, b) => a + b, 0)))
  const [pInterests, pSpecialites, pPreferences] = toPercentages(contributions)
  return {
    formationId: formation.id,
    score,
    dots: Math.round(score),
    interests,
    specialites,
    preferences,
    shares: { interests: pInterests, specialites: pSpecialites, preferences: pPreferences },
  }
}

/** Classement par affinité décroissante ; à égalité, ordre alphabétique (stable et prévisible). */
export const rankFormations = <F extends ScoringFormation>(formations: F[], profile: ScoringProfile) =>
  formations
    .map((formation) => ({ formation, score: scoreFormation(formation, profile) }))
    .sort((a, b) => b.score.score - a.score.score || a.formation.title.localeCompare(b.formation.title, 'fr'))

export interface OpeningTrack<F extends ScoringFormation> {
  formation: F
  score: FormationScore
  domain: DomainId
  reason: string
}

/**
 * Piste d'ouverture : une formation hors des trois meilleures dont le domaine principal
 * n'est au cœur d'aucune d'elles (aucun poids ≥ 0,5 sur leurs domaines principaux),
 * mais qui rejoint un intérêt au moins « Moyennement » du lycéen. On retient la mieux classée.
 */
export const findOpeningTrack = <F extends ScoringFormation>(
  ranked: Array<{ formation: F; score: FormationScore }>,
  profile: ScoringProfile,
  topCount = 3,
): OpeningTrack<F> | null => {
  const top = ranked.slice(0, topCount)
  const topDomains = new Set(top.map((t) => dominantDomain(t.formation)).filter((d): d is DomainId => Boolean(d)))
  for (const candidate of ranked.slice(topCount)) {
    const domain = dominantDomain(candidate.formation)
    if (!domain || topDomains.has(domain)) continue
    const overlaps = [...topDomains].some((d) => (candidate.formation.domainWeights[d] ?? 0) >= 0.5)
    if (overlaps) continue
    const level = profile.interests[domain]
    if (!level || level < 3) continue
    const label = domains.find((d) => d.id === domain)!.short
    return {
      formation: candidate.formation,
      score: candidate.score,
      domain,
      reason: `Proposée pour élargir vos horizons : elle recoupe moins vos réponses mais rejoint votre intérêt pour ${label === 'sciences' ? 'les sciences' : `le domaine « ${domainLabel(domain).toLowerCase()} »`}. Une façon d’éviter de ne voir que ce qui vous ressemble déjà.`,
    }
  }
  return null
}

/** Résumé lisible des préférences, pour les écrans de profil. */
export const describePreferences = (profile: ScoringProfile) =>
  [
    profile.city ? cityLabels[profile.city] : null,
    profile.duration ? durationLabels[profile.duration] : null,
    profile.learning ? learningLabels[profile.learning] : null,
    profile.alternance ? 'Alternance' : null,
  ].filter(Boolean) as string[]
