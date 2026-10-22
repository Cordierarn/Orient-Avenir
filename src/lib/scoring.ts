import { domains, levelLabels } from '../data/domains'
import type { Program, ProgramScore, StudentProfile } from '../types'

const dot = (value: number) => Math.max(1, Math.min(5, Math.round(value)))

const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length

const getInterestScore = (program: Program, profile: StudentProfile) => {
  const values = domains.map((domain) => {
    const user = profile.interests[domain.id] ?? 0
    const weight = program.domainWeights[domain.id]
    return (user / 4) * weight
  })
  return avg(values)
}

const getSpecialityScore = (program: Program, profile: StudentProfile) => {
  if (!profile.specialites.length) {
    return 2.5
  }
  const matches = profile.specialites.filter((s) => program.specialitesConseillees.includes(s)).length
  return (matches / Math.max(1, program.specialitesConseillees.length)) * 5
}

const getPreferenceScore = (program: Program, profile: StudentProfile) => {
  let points = 0
  let total = 0

  total += 1
  if (profile.cityPreference === 'indifferent' || profile.cityPreference === program.tailleVille) {
    points += 1
  }

  total += 1
  if (profile.durationPreference === 'indifferent') {
    points += 1
  } else if (
    (profile.durationPreference === 'court' && program.dureeAnnees <= 2) ||
    (profile.durationPreference === 'moyen' && program.dureeAnnees === 3) ||
    (profile.durationPreference === 'long' && program.dureeAnnees >= 5)
  ) {
    points += 1
  }

  total += 1
  if (profile.learningStyle === 'pratique' && program.partPratique >= 55) {
    points += 1
  }
  if (profile.learningStyle === 'equilibre' && program.partPratique >= 35 && program.partPratique <= 60) {
    points += 1
  }
  if (profile.learningStyle === 'theorique' && program.partPratique <= 35) {
    points += 1
  }

  total += 1
  if (profile.alternancePreference === 'indifferent' || (profile.alternancePreference === 'oui') === program.alternance) {
    points += 1
  }

  return (points / total) * 5
}

export const scoreProgram = (program: Program, profile: StudentProfile): ProgramScore => {
  const interestScore = getInterestScore(program, profile)
  const specialityScore = getSpecialityScore(program, profile)
  const preferenceScore = getPreferenceScore(program, profile)

  const finalScore = 0.5 * interestScore + 0.3 * specialityScore + 0.2 * preferenceScore
  const rounded = Math.round(finalScore * 10) / 10

  const topDomain = domains
    .map((d) => ({ label: d.label, value: profile.interests[d.id] }))
    .sort((a, b) => b.value - a.value)[0]

  return {
    programId: program.id,
    score: rounded,
    affinityDots: dot(rounded),
    breakdown: {
      interests: Math.round((interestScore / 5) * 100),
      specialites: Math.round((specialityScore / 5) * 100),
      preferences: Math.round((preferenceScore / 5) * 100),
    },
    criteriaWeights: {
      interests: 50,
      specialites: 30,
      preferences: 20,
    },
    explanation: `${program.nom} colle bien à votre intérêt "${topDomain.label}" (${levelLabels[topDomain.value]}), avec une correspondance sur les spécialités et votre façon d’apprendre.`,
    openingTrack: false,
  }
}

export const getRecommendations = (programs: Program[], profile: StudentProfile): ProgramScore[] => {
  const sorted = programs.map((program) => scoreProgram(program, profile)).sort((a, b) => b.score - a.score)
  const best = sorted.slice(0, 3)

  const lowestDomain = domains
    .map((d) => ({ id: d.id, value: profile.interests[d.id] }))
    .sort((a, b) => a.value - b.value)
    .find((d) => d.value >= 1)

  const opening =
    lowestDomain &&
    sorted.find((s) => {
      const p = programs.find((program) => program.id === s.programId)
      return p ? p.domainWeights[lowestDomain.id] >= 3 && !best.some((b) => b.programId === s.programId) : false
    })

  if (opening) {
    opening.openingTrack = true
    return [...best, opening]
  }

  return best
}
