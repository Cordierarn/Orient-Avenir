import { describe, expect, it } from 'vitest'
import { programs } from '../data/programs'
import { getRecommendations, scoreProgram } from '../lib/scoring'
import type { StudentProfile } from '../types'

const profile: StudentProfile = {
  interests: {
    numerique: 4,
    sciences: 3,
    concevoir: 2,
    sante: 0,
    social: 1,
    gestion: 1,
    creation: 2,
    langues: 1,
    environnement: 1,
  },
  specialites: ['Maths', 'NSI'],
  cityPreference: 'moyenne',
  durationPreference: 'moyen',
  learningStyle: 'pratique',
  alternancePreference: 'oui',
  moyennes: {},
  useGradesForRepere: false,
}

describe('scoring', () => {
  it('calcule un score sur 5 avec détails', () => {
    const result = scoreProgram(programs[0], profile)
    expect(result.score).toBeGreaterThan(0)
    expect(result.score).toBeLessThanOrEqual(5)
    expect(result.criteriaWeights).toEqual({ interests: 50, specialites: 30, preferences: 20 })
    expect(result.breakdown.interests).toBeGreaterThan(0)
  })

  it('retourne 3 meilleures pistes + 1 piste d’ouverture', () => {
    const recommendations = getRecommendations(programs, profile)
    expect(recommendations.length).toBeGreaterThanOrEqual(3)
    expect(recommendations.length).toBeLessThanOrEqual(4)
    expect(recommendations.some((item) => item.openingTrack)).toBe(true)
  })
})
