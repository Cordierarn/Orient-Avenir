import { describe, expect, it } from 'vitest'
import { db } from '../../src/db/database'
import { AccessDeniedError, activityRepo, counselorRepo, institutionRepo, shareRepo, studentRepo } from '../../src/db/repositories'
import { DEMO_IDS } from '../../src/db/seed'

const { lea, gabriel, alain } = DEMO_IDS

/** Cherche récursivement une clé ou une valeur de moyenne dans une projection. */
const containsGrades = (value: unknown): boolean => {
  const text = JSON.stringify(value)
  return /"grades"|"useGrades"|14\.5|13\.8|Moyenne générale/.test(text)
}

describe('confidentialité des moyennes', () => {
  it('le lycéen propriétaire voit ses moyennes', async () => {
    const own = await studentRepo.getOwnProfile(lea)
    expect(own.grades).toEqual({ Mathématiques: 14.5, NSI: 16, Français: 12, 'Moyenne générale': 13.8 })
  })

  it('un autre compte ne peut pas lire le profil propriétaire de Léa', async () => {
    // getOwnProfile ne prend aucun identifiant cible : seul le compte connecté est lu.
    await expect(studentRepo.getOwnProfile(gabriel)).rejects.toBeInstanceOf(AccessDeniedError)
    await expect(studentRepo.getOwnProfile(alain)).rejects.toBeInstanceOf(AccessDeniedError)
  })

  it('la projection conseiller ne contient aucune moyenne', async () => {
    const dossier = await counselorRepo.getStudentDossier(gabriel, lea)
    expect(dossier.profile).not.toHaveProperty('grades')
    expect(dossier.profile).not.toHaveProperty('useGrades')
    expect(containsGrades(dossier)).toBe(false)
    expect(containsGrades(await counselorRepo.listRequestsForCounselor(gabriel))).toBe(false)
    expect(containsGrades(await counselorRepo.listStudentsForCounselor(gabriel))).toBe(false)
  })

  it('la projection établissement ne contient ni moyenne, ni nom de famille, ni e-mail', async () => {
    const result = await institutionRepo.listInterestedProfiles(alain, 'f-cycle-ingenieur')
    expect(containsGrades(result)).toBe(false)
    const text = JSON.stringify(result)
    expect(text).not.toContain('Dumont')
    expect(text).not.toContain('@')
    expect(Object.keys(result.profiles[0]).sort()).toEqual(['classe', 'firstName', 'openDay', 'questions', 'specialites', 'studentId', 'summary'])
  })

  it('les journaux d’activité ne contiennent aucune moyenne', async () => {
    for (const userId of [lea, gabriel, alain]) expect(containsGrades(await activityRepo.listActivity(userId))).toBe(false)
  })
})

describe('consentement côté conseiller', () => {
  it('refuse l’accès sans partage actif', async () => {
    const before = await counselorRepo.listStudentsForCounselor(gabriel)
    expect(before.map((s) => s.firstName)).toContain('Léa')
    await shareRepo.setShare(lea, 'conseiller', false)
    await expect(counselorRepo.getStudentDossier(gabriel, lea)).rejects.toBeInstanceOf(AccessDeniedError)
    expect((await counselorRepo.listStudentsForCounselor(gabriel)).map((s) => s.firstName)).not.toContain('Léa')
    expect((await counselorRepo.listRequestsForCounselor(gabriel)).map((r) => r.student.firstName)).not.toContain('Léa')
    await expect(counselorRepo.saveNote(gabriel, lea, 'Note')).rejects.toBeInstanceOf(AccessDeniedError)
  })

  it('date et journalise le retrait, puis rétablit l’accès sur nouvel accord', async () => {
    const revoked = await shareRepo.setShare(lea, 'conseiller', false)
    expect(revoked?.revokedAt).toBeDefined()
    expect((await activityRepo.listActivity(lea))[0].type).toBe('partage_retire')
    await shareRepo.setShare(lea, 'conseiller', true)
    expect((await counselorRepo.getStudentDossier(gabriel, lea)).student.firstName).toBe('Léa')
  })

  it('un conseiller sans lien avec l’élève n’a pas accès au dossier', async () => {
    await expect(counselorRepo.getStudentDossier('u-sophie', 'u-noe')).rejects.toBeInstanceOf(AccessDeniedError)
  })

  it('un lycéen ou un établissement ne peut pas utiliser les fonctions conseiller', async () => {
    await expect(counselorRepo.getStudentDossier(lea, 'u-yanis')).rejects.toThrow()
    await expect(counselorRepo.getStudentDossier(alain, lea)).rejects.toThrow()
  })

  it('les notes du conseiller restent séparées des données de l’élève', async () => {
    await counselorRepo.saveNote(gabriel, lea, 'Proposer une visite de l’IUT.', 'entretien_planifie')
    const profile = await studentRepo.getOwnProfile(lea)
    expect(JSON.stringify(profile)).not.toContain('Proposer une visite')
    expect((await db.counselorNotes.get(`${gabriel}:${lea}`))?.body).toBe('Proposer une visite de l’IUT.')
  })
})

describe('consentement côté établissement', () => {
  it('ne montre que les profils consentis et masque immédiatement après retrait', async () => {
    const before = await institutionRepo.listInterestedProfiles(alain, 'f-cycle-ingenieur')
    expect(before.total).toBe(10)
    expect(before.totalLabel).toBe('10')
    expect(before.profiles.map((p) => p.firstName)).toContain('Léa')
    await shareRepo.setShare(lea, 'etablissements', false)
    const after = await institutionRepo.listInterestedProfiles(alain, 'f-cycle-ingenieur')
    expect(after.profiles.map((p) => p.firstName)).not.toContain('Léa')
    expect(after.totalLabel).toBe('Moins de 10')
  })

  it('n’affiche pas un lycéen intéressé sans consentement', async () => {
    // Inès a des favoris mais n'a pas accepté la visibilité auprès des écoles.
    await db.favorites.add({ id: 'fav-ines-cycle', userId: 'u-ines', formationId: 'f-cycle-ingenieur', note: '', addedAt: '2026-10-20T00:00:00.000Z' })
    const result = await institutionRepo.listInterestedProfiles(alain, 'f-cycle-ingenieur')
    expect(result.profiles.map((p) => p.firstName)).not.toContain('Inès')
  })

  it('refuse l’accès aux profils d’une formation d’un autre établissement', async () => {
    await expect(institutionRepo.listInterestedProfiles(alain, 'f-but-info')).rejects.toBeInstanceOf(AccessDeniedError)
  })

  it('refuse d’inviter un lycéen qui a retiré son accord', async () => {
    await shareRepo.setShare(lea, 'etablissements', false)
    await expect(institutionRepo.inviteToOpenDay(alain, 'f-cycle-ingenieur', lea)).rejects.toBeInstanceOf(AccessDeniedError)
  })
})
