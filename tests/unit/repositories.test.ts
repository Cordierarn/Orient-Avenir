import { describe, expect, it } from 'vitest'
import { db } from '../../src/db/database'
import {
  activityRepo,
  appointmentRepo,
  authRepo,
  comparisonRepo,
  counselorRepo,
  deadlineRepo,
  demoRepo,
  favoriteRepo,
  formationRepo,
  GuestForbiddenError,
  institutionRepo,
  messageRepo,
  shareRepo,
  studentRepo,
  ValidationError,
} from '../../src/db/repositories'
import { DEMO_IDS, SEED_VERSION } from '../../src/db/seed'

const { lea, gabriel, alain } = DEMO_IDS

const newStudent = (email = 'nouveau@exemple.fr') =>
  authRepo.register({
    role: 'lyceen',
    firstName: 'Nina',
    lastName: 'Petit',
    email,
    password: 'motdepasse',
    confirmPassword: 'motdepasse',
    acceptTerms: true,
  })

describe('seed et réinitialisation', () => {
  it('charge le seed versionné au premier lancement', async () => {
    expect(await demoRepo.getSeedVersion()).toBe(SEED_VERSION)
    expect(await db.formations.count()).toBe(17)
    expect(await db.users.filter((u) => u.isDemo).count()).toBe(3)
  })

  it('n’écrase pas les données utilisateur à la réouverture', async () => {
    await favoriteRepo.removeFavorite(lea, 'f-but-info')
    demoRepo.resetInitCache()
    await demoRepo.initDatabase()
    expect(await favoriteRepo.listFavoriteIds(lea)).toEqual(['f-licence-info'])
  })

  it('migre sans détruire : ajoute seulement les enregistrements manquants', async () => {
    await favoriteRepo.updateNote(lea, 'f-but-info', 'Note modifiée')
    await db.formations.delete('f-ifsi')
    await db.meta.put({ key: 'seedVersion', value: 0 })
    demoRepo.resetInitCache()
    await demoRepo.initDatabase()
    expect(await db.formations.get('f-ifsi')).toBeDefined()
    expect((await favoriteRepo.listFavorites(lea)).find((f) => f.formationId === 'f-but-info')?.note).toBe('Note modifiée')
  })

  it('réinitialise les données de démo et conserve les autres comptes', async () => {
    const other = await newStudent()
    await favoriteRepo.addFavorite(other.id, 'f-but-info')
    await favoriteRepo.removeFavorite(lea, 'f-but-info')
    await shareRepo.setShare(lea, 'conseiller', false)
    await demoRepo.resetDemoData(lea)
    expect(await favoriteRepo.listFavoriteIds(lea)).toEqual(['f-but-info', 'f-licence-info'])
    expect((await shareRepo.getShares(lea)).conseiller?.active).toBe(true)
    expect(await favoriteRepo.listFavoriteIds(other.id)).toEqual(['f-but-info'])
    const types = (await activityRepo.listActivity(lea)).map((a) => a.type)
    expect(types[0]).toBe('reinitialisation')
  })
})

describe('profil lycéen', () => {
  it('enregistre intérêts, préférences et dossier par compte', async () => {
    const student = await newStudent()
    await studentRepo.saveInterests(student.id, { numerique: 4 })
    await studentRepo.savePreferences(student.id, { specialites: ['SVT', 'SES'], city: 'grande', duration: '3', learning: 'equilibree', alternance: false })
    await studentRepo.saveDossier(student.id, { Mathématiques: '12,5', Français: '' }, true)
    const profile = await studentRepo.getOwnProfile(student.id)
    expect(profile.interests).toEqual({ numerique: 4 })
    expect(profile.grades).toEqual({ Mathématiques: 12.5 })
    expect(profile.completedSteps).toEqual([1, 2, 3])
    // Le profil de Léa n'est pas modifié.
    expect((await studentRepo.getOwnProfile(lea)).interests.numerique).toBe(5)
  })

  it('valide les préférences et les moyennes avec des messages précis', async () => {
    const student = await newStudent()
    await expect(studentRepo.savePreferences(student.id, { specialites: ['SVT'], alternance: false })).rejects.toBeInstanceOf(ValidationError)
    await expect(studentRepo.saveDossier(student.id, { Mathématiques: '25' }, true)).rejects.toThrow('Certaines moyennes sont invalides')
  })
})

describe('favoris et comparaisons', () => {
  it('ajoute, annote et retire des favoris sans toucher aux autres comptes', async () => {
    const student = await newStudent()
    await favoriteRepo.addFavorite(student.id, 'f-bts-sio')
    await favoriteRepo.updateNote(student.id, 'f-bts-sio', 'À visiter')
    const list = await favoriteRepo.listFavorites(student.id)
    expect(list).toHaveLength(1)
    expect(list[0].note).toBe('À visiter')
    expect(list[0].formation.institution.name).toBe('Lycée Jean-Moulin, Valmont')
    expect(await favoriteRepo.toggleFavorite(student.id, 'f-bts-sio')).toBe(false)
    expect(await favoriteRepo.listFavorites(student.id)).toHaveLength(0)
    expect(await favoriteRepo.listFavoriteIds(lea)).toHaveLength(2)
  })

  it('refuse d’ajouter une fiche en brouillon', async () => {
    await expect(favoriteRepo.addFavorite(lea, 'f-prepa-integree')).rejects.toThrow('n’est plus publiée')
  })

  it('limite la comparaison à trois formations', async () => {
    const student = await newStudent()
    await comparisonRepo.addToComparison(student.id, 'f-but-info')
    await comparisonRepo.addToComparison(student.id, 'f-licence-info')
    await comparisonRepo.addToComparison(student.id, 'f-bts-sio')
    await expect(comparisonRepo.addToComparison(student.id, 'f-ifsi')).rejects.toThrow('Vous comparez déjà 3 formations')
    await comparisonRepo.removeFromComparison(student.id, 'f-licence-info')
    expect(await comparisonRepo.getComparisonIds(student.id)).toEqual(['f-but-info', 'f-bts-sio'])
    expect(await comparisonRepo.getComparisonIds(lea)).toHaveLength(3)
  })
})

describe('mode invité', () => {
  it('autorise favoris et comparaison mais interdit partage, rendez-vous et messagerie', async () => {
    const guest = await authRepo.getOrCreateGuest()
    await favoriteRepo.addFavorite(guest.id, 'f-but-info')
    await comparisonRepo.addToComparison(guest.id, 'f-but-info')
    await expect(shareRepo.setShare(guest.id, 'conseiller', true)).rejects.toBeInstanceOf(GuestForbiddenError)
    await expect(shareRepo.setShare(guest.id, 'etablissements', true)).rejects.toBeInstanceOf(GuestForbiddenError)
    await expect(
      appointmentRepo.createRequest(guest.id, { slots: ['2026-11-02T12:00:00', '2026-11-03T12:00:00'], format: 'visio', preferredCounselorId: null, topic: '' }),
    ).rejects.toBeInstanceOf(GuestForbiddenError)
    await expect(messageRepo.sendMessage(guest.id, gabriel, 'Bonjour')).rejects.toBeInstanceOf(GuestForbiddenError)
  })

  it('réutilise le même invité sur cet appareil', async () => {
    const guest = await authRepo.getOrCreateGuest()
    expect((await authRepo.getOrCreateGuest(guest.id)).id).toBe(guest.id)
  })
})

describe('rendez-vous et messagerie entre rôles', () => {
  it('fait circuler la demande de Léa jusqu’à Gabriel puis le rendez-vous confirmé', async () => {
    const requests = await counselorRepo.listRequestsForCounselor(gabriel)
    expect(requests.map((r) => r.student.firstName)).toEqual(['Léa', 'Yanis', 'Inès'])
    const leaRequest = requests.find((r) => r.student.id === lea)!
    expect(leaRequest.match.label).toBe('Correspond à vos domaines : numérique')

    await appointmentRepo.acceptRequest(gabriel, leaRequest.request.id, '2026-11-05T17:00:00')
    const latest = await appointmentRepo.getLatestRequest(lea)
    expect(latest?.request.status).toBe('acceptee')
    expect(latest?.appointment?.startsAt).toBe('2026-11-05T17:00:00')
    expect(latest?.counselor?.name).toBe('Gabriel B.')
    expect((await counselorRepo.listRequestsForCounselor(gabriel)).map((r) => r.student.firstName)).toEqual(['Yanis', 'Inès'])
    const leaLog = (await activityRepo.listActivity(lea)).map((a) => a.type)
    expect(leaLog).toContain('rdv_accepte')
  })

  it('refuse un créneau non proposé et une demande déjà traitée', async () => {
    await expect(appointmentRepo.acceptRequest(gabriel, 'req-lea', '2026-11-09T09:00:00')).rejects.toThrow('créneaux proposés')
    await appointmentRepo.acceptRequest(gabriel, 'req-lea', '2026-11-04T12:00:00')
    await expect(appointmentRepo.acceptRequest(gabriel, 'req-lea', '2026-11-05T17:00:00')).rejects.toThrow()
  })

  it('« Laisser à un autre conseiller » rouvre la demande, puis la refuse si personne ne la prend', async () => {
    expect(await appointmentRepo.declineRequest(gabriel, 'req-lea')).toBe('en_attente')
    expect((await counselorRepo.listRequestsForCounselor(gabriel)).some((r) => r.request.id === 'req-lea')).toBe(false)
    expect((await counselorRepo.listRequestsForCounselor('u-sophie')).some((r) => r.request.id === 'req-lea')).toBe(true)
    expect(await appointmentRepo.declineRequest('u-sophie', 'req-lea')).toBe('refusee')
    expect((await appointmentRepo.getLatestRequest(lea))?.request.status).toBe('refusee')
  })

  it('crée une demande valide et empêche les doublons', async () => {
    await appointmentRepo.cancelRequest(lea, 'req-lea')
    await expect(
      appointmentRepo.createRequest(lea, { slots: ['2026-11-02T12:00:00'], format: 'visio', preferredCounselorId: gabriel, topic: '' }),
    ).rejects.toThrow('La demande est incomplète')
    await appointmentRepo.createRequest(lea, { slots: ['2026-11-02T12:00:00', '2026-11-03T17:00:00'], format: 'chat', preferredCounselorId: gabriel, topic: 'Test' })
    await expect(
      appointmentRepo.createRequest(lea, { slots: ['2026-11-02T12:00:00', '2026-11-03T17:00:00'], format: 'chat', preferredCounselorId: gabriel, topic: '' }),
    ).rejects.toThrow('déjà en attente')
  })

  it('n’ouvre la messagerie qu’après un rendez-vous et la réserve aux deux participants', async () => {
    await expect(messageRepo.sendMessage(lea, gabriel, 'Bonjour')).rejects.toThrow('L’échange s’ouvre')
    await appointmentRepo.acceptRequest(gabriel, 'req-lea', '2026-11-05T17:00:00')
    await messageRepo.sendMessage(gabriel, lea, 'Bonjour Léa, j’ai lu ton dossier.')
    await messageRepo.sendMessage(lea, gabriel, 'Merci !')
    const forLea = await messageRepo.listMessages(lea, gabriel)
    const forGabriel = await messageRepo.listMessages(gabriel, lea)
    expect(forLea.map((m) => m.body)).toEqual(['Bonjour Léa, j’ai lu ton dossier.', 'Merci !'])
    expect(forGabriel).toEqual(forLea)
    // Noé et Gabriel ont leur propre conversation, sans mélange.
    await messageRepo.sendMessage(gabriel, 'u-noe', 'Message pour Noé')
    expect((await messageRepo.listMessages(lea, gabriel)).some((m) => m.body === 'Message pour Noé')).toBe(false)
    // Un tiers (Alain, ou Sophie sans rendez-vous) ne peut pas lire la conversation.
    await expect(messageRepo.listMessages(alain, lea)).rejects.toThrow()
    await expect(messageRepo.listMessages('u-sophie', lea)).rejects.toThrow()
    await expect(messageRepo.sendMessage(lea, gabriel, '   ')).rejects.toThrow('Écrivez un message')
  })
})

describe('fiches établissement', () => {
  const complete = {
    title: 'Prépa intégrée',
    typeLong: 'Diplôme d’ingénieur · admission post-bac',
    durationLabel: '2 ans de prépa intégrée, puis 3 ans de cycle ingénieur',
    summary: 'Mathématiques, physique et informatique renforcées.',
    outcomes: 'Ingénieur en numérique, énergie ou industrie.',
    vigilance: 'Rythme soutenu en mathématiques et physique.',
  }

  it('bloque la publication sans débouchés ni point de vigilance, en conservant les saisies', async () => {
    try {
      await formationRepo.publish(alain, 'f-prepa-integree', { ...complete, outcomes: '', vigilance: '  ', summary: 'Résumé modifié' })
      throw new Error('La publication aurait dû échouer')
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      const validation = error as ValidationError
      expect(validation.message).toBe('2 rubriques à compléter avant publication')
      expect(validation.fieldErrors).toEqual({
        outcomes: 'Indiquez au moins un métier ou une poursuite d’études.',
        vigilance: 'Indiquez une difficulté ou un point d’attention pour les futurs étudiants.',
      })
    }
    const stored = (await formationRepo.listForInstitution(alain)).find((f) => f.id === 'f-prepa-integree')
    expect(stored?.status).toBe('brouillon')
    expect(stored?.summary).toBe('Résumé modifié')
    expect(await formationRepo.getPublished('f-prepa-integree')).toBeNull()
  })

  it('publie une fiche complète, visible en découverte, en favori et en comparaison', async () => {
    await formationRepo.publish(alain, 'f-prepa-integree', complete)
    expect((await formationRepo.listPublished()).some((f) => f.id === 'f-prepa-integree')).toBe(true)
    await favoriteRepo.addFavorite(lea, 'f-prepa-integree')
    await comparisonRepo.removeFromComparison(lea, 'f-cycle-ingenieur')
    await comparisonRepo.addToComparison(lea, 'f-prepa-integree')
    expect((await comparisonRepo.getCompared(lea)).map((f) => f.id)).toContain('f-prepa-integree')
    expect((await activityRepo.listActivity(alain))[0].type).toBe('fiche_publiee')
  })

  it('n’autorise un établissement qu’à modifier ses propres fiches', async () => {
    await expect(formationRepo.publish(alain, 'f-but-info', complete)).rejects.toThrow('n’appartient pas')
    await expect(formationRepo.listForInstitution(lea)).rejects.toThrow()
    expect((await formationRepo.listForInstitution(alain)).map((f) => f.id).sort()).toEqual(
      ['f-admission-but-bts', 'f-cycle-ingenieur', 'f-prepa-integree'].sort(),
    )
  })

  it('n’expose que des chiffres agrégés, masqués sous 10', async () => {
    const stats = await formationRepo.getInterestStats(alain)
    const cycle = stats.find((s) => s.formationId === 'f-cycle-ingenieur')!
    expect(cycle.favoritesLabel).toBe('38')
    expect(cycle.comparisonsLabel).toBe('27')
    const prepa = stats.find((s) => s.formationId === 'f-prepa-integree')!
    expect(prepa.favoritesLabel).toBe('Moins de 10')
    expect(prepa.favorites).toBeNull()
    expect(prepa.trend).toBe('Masqué')
  })
})

describe('échéances', () => {
  it('liste les échéances officielles et personnelles du seul compte connecté', async () => {
    const leaDeadlines = await deadlineRepo.listDeadlines(lea)
    expect(leaDeadlines).toHaveLength(7)
    const student = await newStudent()
    expect(await deadlineRepo.listDeadlines(student.id)).toHaveLength(5)
    await deadlineRepo.addOpenDayFromFormation(student.id, 'f-but-info')
    expect(await deadlineRepo.countPersonalUpcoming(student.id, new Date(2026, 9, 26))).toBe(1)
    expect((await deadlineRepo.addOpenDayFromFormation(student.id, 'f-but-info')).alreadyAdded).toBe(true)
  })

  it('calcule les rappels dus selon la date du jour simulée', async () => {
    const settings = await deadlineRepo.saveReminders(lea, { simulatedToday: '2027-02-01' })
    const due = deadlineRepo.computeDueReminders(await deadlineRepo.listDeadlines(lea), settings, deadlineRepo.effectiveToday(settings))
    expect(due.map((d) => d.deadline.id)).toEqual(['dl-lea-po-iut'])
    expect(due[0].daysLeft).toBe(5)
  })
})

describe('institutions', () => {
  it('rattache un nouveau compte établissement à un établissement créé', async () => {
    const user = await authRepo.register({
      role: 'etablissement',
      firstName: 'Marie',
      lastName: 'Roux',
      email: 'm.roux@exemple.fr',
      password: 'motdepasse',
      confirmPassword: 'motdepasse',
      acceptTerms: true,
    })
    await expect(institutionRepo.createInstitution(user.id, { name: '', kind: '', city: '', citySize: '', sector: '', distanceKm: '' })).rejects.toBeInstanceOf(
      ValidationError,
    )
    const inst = await institutionRepo.createInstitution(user.id, {
      name: 'Lycée Pasteur',
      kind: 'Lycée',
      city: 'Valmont',
      citySize: 'moyenne',
      sector: 'public',
      distanceKm: '8',
    })
    expect((await institutionRepo.getOwnInstitution(user.id))?.id).toBe(inst.id)
    const created = await formationRepo.createFormation(user.id, 'BTS Comptabilité')
    expect(created.status).toBe('brouillon')
    expect(await formationRepo.getPublished(created.id)).toBeNull()
  })
})
