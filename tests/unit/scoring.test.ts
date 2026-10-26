import { describe, expect, it } from 'vitest'
import { seedFormations } from '../../src/db/seed/formations'
import { seedInstitutions } from '../../src/db/seed/institutions'
import { seedStudentProfiles } from '../../src/db/seed/accounts'
import {
  findOpeningTrack,
  NEUTRAL,
  rankFormations,
  scoreFormation,
  toPercentages,
  WEIGHTS,
  type ScoringFormation,
  type ScoringProfile,
} from '../../src/lib/scoring'
import type { DomainId, Level } from '../../src/types'

const institutions = new Map(seedInstitutions.map((i) => [i.id, i]))
const formations: ScoringFormation[] = seedFormations
  .filter((f) => f.status === 'publiee' && f.admissionLevel === 'post-bac')
  .map((f) => ({ ...f, institution: institutions.get(f.institutionId)! }))
const byId = (id: string) => formations.find((f) => f.id === id)!

const lea = seedStudentProfiles.find((p) => p.userId === 'u-lea')!

const allDomains: DomainId[] = ['numerique', 'sciences', 'concevoir', 'sante', 'social', 'gestion', 'creation', 'langues', 'environnement']
const fill = (level: Level) => Object.fromEntries(allDomains.map((d) => [d, level])) as Record<DomainId, Level>

const formation: ScoringFormation = {
  id: 'test',
  title: 'Formation test',
  domainWeights: { numerique: 1 },
  tags: ['numerique'],
  specialites: ['Mathématiques', 'NSI'],
  durationYears: 3,
  practicePercent: 65,
  alternance: true,
  institution: { citySize: 'moyenne', city: 'Valmont' },
}

describe('scoring', () => {
  it('donne 0 quand rien ne correspond', () => {
    const profile: ScoringProfile = {
      interests: fill(1),
      specialites: ['SES', 'HGGSP'],
      city: 'grande' as const,
      duration: '5+' as const,
      learning: 'theorique' as const,
      alternance: true,
    }
    const result = scoreFormation({ ...formation, alternance: false, practicePercent: 80, durationYears: 2, institution: { citySize: 'petite', city: 'X' } }, profile)
    expect(result.score).toBe(0)
    expect(result.dots).toBe(0)
  })

  it('donne 5 quand tout correspond', () => {
    const profile: ScoringProfile = { interests: fill(5), specialites: ['Mathématiques', 'NSI'], city: 'moyenne', duration: '3', learning: 'pratique', alternance: true }
    const result = scoreFormation(formation, profile)
    expect(result.score).toBe(5)
    expect(result.dots).toBe(5)
  })

  it('applique la pondération 50 / 30 / 20', () => {
    // Intérêts au maximum, spécialités nulles, préférences au maximum.
    const profile: ScoringProfile = { interests: fill(5), specialites: ['SES', 'HGGSP'], city: 'moyenne', duration: '3', learning: 'pratique', alternance: true }
    const result = scoreFormation(formation, profile)
    expect(result.interests.value).toBe(5)
    expect(result.specialites.value).toBe(0)
    expect(result.preferences.value).toBe(5)
    expect(result.score).toBeCloseTo(WEIGHTS.interests * 5 + WEIGHTS.preferences * 5, 5)
    expect(WEIGHTS.interests + WEIGHTS.specialites + WEIGHTS.preferences).toBeCloseTo(1, 10)
  })

  it('reste borné entre 0 et 5 même avec des données aberrantes', () => {
    const profile = { interests: { numerique: 9 as Level }, specialites: ['Mathématiques', 'NSI', 'NSI'], alternance: false }
    const result = scoreFormation({ ...formation, domainWeights: { numerique: 50 } }, profile)
    expect(result.score).toBeLessThanOrEqual(5)
    expect(result.score).toBeGreaterThanOrEqual(0)
  })

  it('utilise une valeur neutre quand les réponses manquent', () => {
    const result = scoreFormation(formation, { interests: {}, specialites: [], alternance: false })
    expect(result.interests).toMatchObject({ value: NEUTRAL, missing: true })
    expect(result.specialites).toMatchObject({ value: NEUTRAL, missing: true })
    expect(result.preferences).toMatchObject({ value: NEUTRAL, missing: true })
    expect(result.score).toBe(NEUTRAL)
  })

  it('fournit des pourcentages entiers qui totalisent 100', () => {
    for (const f of formations) {
      const { shares } = scoreFormation(f, lea)
      expect(shares.interests + shares.specialites + shares.preferences).toBe(100)
    }
    expect(toPercentages([0, 0, 0])).toEqual([34, 33, 33])
    expect(toPercentages([1, 1, 1]).reduce((a, b) => a + b)).toBe(100)
  })

  it('fournit une explication pour chaque composante', () => {
    const result = scoreFormation(byId('f-but-info'), lea)
    expect(result.interests.explanation).toBe('Numérique et code : « Passionnément ».')
    expect(result.specialites.explanation).toBe('Mathématiques et NSI sont conseillées.')
    expect(result.preferences.explanation.length).toBeGreaterThan(0)
  })

  it('départage les égalités par ordre alphabétique', () => {
    const a = { ...formation, id: 'a', title: 'Bêta' }
    const b = { ...formation, id: 'b', title: 'Alpha' }
    const ranked = rankFormations([a, b], lea)
    expect(ranked[0].score.score).toBe(ranked[1].score.score)
    expect(ranked.map((r) => r.formation.title)).toEqual(['Alpha', 'Bêta'])
  })

  it('classe les pistes de Léa comme dans la maquette', () => {
    const ranked = rankFormations(formations, lea)
    expect(ranked.slice(0, 3).map((r) => r.formation.id)).toEqual(['f-but-info', 'f-licence-info', 'f-cycle-ingenieur'])
    for (let i = 1; i < ranked.length; i += 1) expect(ranked[i - 1].score.score).toBeGreaterThanOrEqual(ranked[i].score.score)
  })

  it('choisit une piste d’ouverture éloignée des trois premières mais liée à un intérêt', () => {
    const ranked = rankFormations(formations, lea)
    const opening = findOpeningTrack(ranked, lea)
    expect(opening?.formation.id).toBe('f-licence-sv')
    expect(opening?.domain).toBe('sciences')
    expect(ranked.slice(0, 3).some((r) => r.formation.id === opening?.formation.id)).toBe(false)
    expect(opening?.reason).toContain('les sciences')
  })

  it('ne propose pas de piste d’ouverture sans intérêt suffisant', () => {
    const ranked = rankFormations(formations, { ...lea, interests: { numerique: 5 } })
    expect(findOpeningTrack(ranked, { ...lea, interests: { numerique: 5 } })).toBeNull()
  })
})
