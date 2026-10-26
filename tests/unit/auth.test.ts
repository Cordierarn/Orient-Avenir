import { describe, expect, it } from 'vitest'
import { db } from '../../src/db/database'
import { authRepo, ValidationError } from '../../src/db/repositories'
import type { RegistrationInput } from '../../src/db/repositories/authRepository'
import { DEMO_IDS } from '../../src/db/seed'

const valid: RegistrationInput = {
  role: 'lyceen',
  firstName: 'Camille',
  lastName: 'Martin',
  email: 'camille.martin@exemple.fr',
  password: 'motdepasse',
  confirmPassword: 'motdepasse',
  acceptTerms: true,
}

const fieldErrors = async (promise: Promise<unknown>) => {
  try {
    await promise
  } catch (error) {
    if (error instanceof ValidationError) return error.fieldErrors
    throw error
  }
  throw new Error('Une erreur de validation était attendue')
}

describe('inscription', () => {
  it('crée un compte lycéen avec un profil vide et un mot de passe haché', async () => {
    const user = await authRepo.register(valid)
    expect(user).not.toHaveProperty('credential')
    const stored = await db.users.get(user.id)
    expect(stored?.credential?.algorithm).toBe('PBKDF2-SHA-256')
    expect(stored?.credential?.iterations).toBe(600_000)
    expect(JSON.stringify(stored)).not.toContain('motdepasse')
    const profile = await db.studentProfiles.get(user.id)
    expect(profile?.interests).toEqual({})
    expect(profile?.completedSteps).toEqual([])
  })

  it('utilise un sel différent pour chaque compte', async () => {
    const a = await authRepo.register(valid)
    const b = await authRepo.register({ ...valid, email: 'autre@exemple.fr' })
    const [ua, ub] = await Promise.all([db.users.get(a.id), db.users.get(b.id)])
    expect(ua?.credential?.salt).not.toBe(ub?.credential?.salt)
    expect(ua?.credential?.hash).not.toBe(ub?.credential?.hash)
  })

  it('normalise l’e-mail et refuse un e-mail déjà utilisé', async () => {
    const user = await authRepo.register({ ...valid, email: '  Camille.Martin@Exemple.FR ' })
    expect(user.email).toBe('camille.martin@exemple.fr')
    const errors = await fieldErrors(authRepo.register({ ...valid, email: 'CAMILLE.MARTIN@exemple.fr' }))
    expect(errors.email).toContain('Un compte existe déjà')
  })

  it('refuse l’e-mail d’un compte de démonstration', async () => {
    const errors = await fieldErrors(authRepo.register({ ...valid, email: 'lea.d@exemple.fr' }))
    expect(errors.email).toContain('existe déjà')
  })

  it('valide chaque champ avec un message précis', async () => {
    expect((await fieldErrors(authRepo.register({ ...valid, password: 'court', confirmPassword: 'court' }))).password).toBe(
      'Le mot de passe doit contenir au moins 8 caractères (actuellement 5).',
    )
    expect((await fieldErrors(authRepo.register({ ...valid, confirmPassword: 'different' }))).confirmPassword).toBe(
      'Les deux mots de passe ne sont pas identiques.',
    )
    expect((await fieldErrors(authRepo.register({ ...valid, acceptTerms: false }))).acceptTerms).toBe(
      'Acceptez les conditions d’utilisation pour créer un compte.',
    )
    expect((await fieldErrors(authRepo.register({ ...valid, email: 'pas-un-email' }))).email).toContain('Adresse e-mail invalide')
    expect((await fieldErrors(authRepo.register({ ...valid, role: '' }))).role).toBeDefined()
  })

  it('crée un compte conseiller qui doit renseigner son profil', async () => {
    const user = await authRepo.register({ ...valid, role: 'conseiller', email: 'conseil@exemple.fr' })
    expect(user.onboarded).toBe(false)
    expect(await db.studentProfiles.get(user.id)).toBeUndefined()
  })

  it('journalise l’inscription sans aucune donnée d’authentification', async () => {
    const user = await authRepo.register(valid)
    const log = await db.activityLog.where('userId').equals(user.id).toArray()
    expect(log.map((e) => e.type)).toContain('inscription')
    const credential = (await db.users.get(user.id))!.credential!
    for (const entry of log) {
      expect(entry.description).not.toContain('motdepasse')
      expect(entry.description).not.toContain(credential.salt)
      expect(entry.description).not.toContain(credential.hash)
    }
  })
})

describe('connexion et sessions', () => {
  it('connecte avec le bon mot de passe et un e-mail non normalisé', async () => {
    await authRepo.register(valid)
    const user = await authRepo.login('  CAMILLE.martin@exemple.fr', 'motdepasse')
    expect(user.firstName).toBe('Camille')
  })

  it('refuse un mot de passe incorrect avec un message précis', async () => {
    await authRepo.register(valid)
    await expect(authRepo.login(valid.email, 'mauvais-mdp')).rejects.toThrow('Mot de passe incorrect')
    await expect(authRepo.login('inconnu@exemple.fr', 'motdepasse')).rejects.toThrow('Aucun compte ne correspond')
  })

  it('connecte les comptes de démonstration avec le mot de passe documenté', async () => {
    for (const email of ['lea.d@exemple.fr', 'gabriel.b@exemple.fr', 'a.aubert@aurelis.exemple']) {
      const user = await authRepo.login(email, 'demo1234')
      expect(user.isDemo).toBe(true)
    }
  })

  it('connecte en un clic uniquement les comptes de démonstration', async () => {
    expect((await authRepo.loginDemo(DEMO_IDS.lea)).role).toBe('lyceen')
    expect((await authRepo.loginDemo(DEMO_IDS.gabriel)).role).toBe('conseiller')
    expect((await authRepo.loginDemo(DEMO_IDS.alain)).role).toBe('etablissement')
    const other = await authRepo.register(valid)
    await expect(authRepo.loginDemo(other.id)).rejects.toThrow('Seuls les comptes de démonstration')
  })

  it('refuse la connexion des personnes fictives sans identifiants', async () => {
    await expect(authRepo.login('yanis.b@exemple.fr', 'demo1234')).rejects.toThrow('ne permet pas de se connecter')
  })

  it('crée une session persistante ou temporaire et la révoque à la déconnexion', async () => {
    const persistent = await authRepo.createSession(DEMO_IDS.lea, true)
    const temporary = await authRepo.createSession(DEMO_IDS.lea, false)
    expect(persistent.persistent).toBe(true)
    expect(temporary.persistent).toBe(false)
    expect((await authRepo.resolveSession(persistent.id))?.id).toBe(DEMO_IDS.lea)
    await authRepo.logout(persistent.id)
    expect(await authRepo.resolveSession(persistent.id)).toBeNull()
    expect((await authRepo.resolveSession(temporary.id))?.id).toBe(DEMO_IDS.lea)
    const types = (await db.activityLog.where('userId').equals(DEMO_IDS.lea).toArray()).map((e) => e.type)
    expect(types).toContain('connexion')
    expect(types).toContain('deconnexion')
  })

  it('la déconnexion ne supprime pas les données du compte', async () => {
    const session = await authRepo.createSession(DEMO_IDS.lea, false)
    await authRepo.logout(session.id)
    expect(await db.favorites.where('userId').equals(DEMO_IDS.lea).count()).toBe(2)
    expect(await db.studentProfiles.get(DEMO_IDS.lea)).toBeDefined()
  })

  it('liste les trois comptes de démonstration dans l’ordre des rôles', async () => {
    const accounts = await authRepo.listDemoAccounts()
    expect(accounts.map((a) => a.role)).toEqual(['lyceen', 'conseiller', 'etablissement'])
    expect(accounts.every((a) => !('credential' in a))).toBe(true)
  })

  it('répond de façon neutre à une demande de réinitialisation', async () => {
    const known = await authRepo.requestPasswordReset('lea.d@exemple.fr')
    const unknown = await authRepo.requestPasswordReset('personne@exemple.fr')
    expect(known).toBe(unknown)
    await expect(authRepo.requestPasswordReset('invalide')).rejects.toThrow('Adresse e-mail invalide')
  })
})
