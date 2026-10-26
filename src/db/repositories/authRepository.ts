import { db } from '../database'
import { newId, nowIso } from '../../lib/ids'
import { hashPassword, PASSWORD_MIN_LENGTH, verifyPassword } from '../../lib/password'
import { isValidEmail, normalizeEmail } from '../../lib/text'
import type { PublicUser, Role, Session, User } from '../../types'
import { AuthError, ValidationError } from './errors'
import { log, requireUser, toPublicUser } from './internal'

export interface RegistrationInput {
  role: Role | ''
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  acceptTerms: boolean
}

export type RegistrationField = keyof RegistrationInput

/** Validation synchrone, utilisée en direct par le formulaire et par `register`. */
export const validateRegistration = (input: RegistrationInput) => {
  const errors: Partial<Record<RegistrationField, string>> = {}
  if (!input.role) errors.role = 'Choisissez votre profil : lycéen, conseiller ou établissement.'
  if (!input.firstName.trim()) errors.firstName = 'Indiquez votre prénom.'
  if (!input.lastName.trim()) errors.lastName = 'Indiquez votre nom.'
  if (!input.email.trim()) errors.email = 'Indiquez votre adresse e-mail.'
  else if (!isValidEmail(input.email)) errors.email = 'Adresse e-mail invalide : vérifiez le format, par exemple prenom.nom@exemple.fr.'
  if (!input.password) errors.password = 'Choisissez un mot de passe.'
  else if (input.password.length < PASSWORD_MIN_LENGTH)
    errors.password = `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères (actuellement ${input.password.length}).`
  if (!input.confirmPassword) errors.confirmPassword = 'Confirmez votre mot de passe.'
  else if (input.confirmPassword !== input.password) errors.confirmPassword = 'Les deux mots de passe ne sont pas identiques.'
  if (!input.acceptTerms) errors.acceptTerms = 'Acceptez les conditions d’utilisation pour créer un compte.'
  return errors
}

export const isEmailTaken = async (email: string) => Boolean(await db.users.where('email').equals(normalizeEmail(email)).first())

export const register = async (input: RegistrationInput): Promise<PublicUser> => {
  const errors = validateRegistration(input)
  if (Object.keys(errors).length) throw new ValidationError<RegistrationField>('Le formulaire contient des erreurs.', errors)
  const email = normalizeEmail(input.email)
  if (await isEmailTaken(email)) {
    throw new ValidationError<RegistrationField>('Le formulaire contient des erreurs.', {
      email: 'Un compte existe déjà avec cette adresse e-mail dans ce navigateur. Connectez-vous ou utilisez une autre adresse.',
    })
  }
  const credential = await hashPassword(input.password)
  const now = nowIso()
  const user: User = {
    id: newId('u'),
    email,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    role: input.role as Role,
    credential,
    isDemo: false,
    isGuest: false,
    onboarded: input.role === 'lyceen',
    createdAt: now,
  }
  await db.transaction('rw', [db.users, db.studentProfiles, db.reminders], async () => {
    await db.users.add(user)
    if (user.role === 'lyceen') {
      await db.studentProfiles.add({
        userId: user.id,
        classe: 'Terminale générale',
        interests: {},
        specialites: [],
        alternance: false,
        grades: {},
        useGrades: false,
        completedSteps: [],
        updatedAt: now,
      })
    }
  })
  const roleLabel = { lyceen: 'lycéen', conseiller: 'conseiller', etablissement: 'établissement' }[user.role]
  await log(user.id, user, 'inscription', `Création du compte ${roleLabel}.`)
  return toPublicUser(user)
}

export const login = async (rawEmail: string, password: string): Promise<PublicUser> => {
  if (!rawEmail.trim()) throw new AuthError('Indiquez votre adresse e-mail.', 'email')
  if (!isValidEmail(rawEmail)) throw new AuthError('Adresse e-mail invalide : vérifiez le format.', 'email')
  if (!password) throw new AuthError('Indiquez votre mot de passe.', 'password')
  const user = await db.users.where('email').equals(normalizeEmail(rawEmail)).first()
  if (!user || user.isGuest) {
    throw new AuthError('Aucun compte ne correspond à cette adresse e-mail dans ce navigateur. Vérifiez-la ou créez un compte.', 'email')
  }
  if (!user.credential) {
    throw new AuthError('Ce compte fictif sert uniquement à la démonstration : il ne permet pas de se connecter.', 'email')
  }
  if (!(await verifyPassword(password, user.credential))) {
    throw new AuthError('Mot de passe incorrect. Vérifiez la saisie (majuscules, chiffres) ou utilisez « Mot de passe oublié ? ».', 'password')
  }
  return toPublicUser(user)
}

/** Connexion en un clic : réservée aux comptes de démonstration. */
export const loginDemo = async (userId: string): Promise<PublicUser> => {
  const user = await requireUser(userId)
  if (!user.isDemo) throw new AuthError('Seuls les comptes de démonstration permettent une connexion en un clic. Saisissez votre mot de passe.')
  return toPublicUser(user)
}

export const listDemoAccounts = async (): Promise<PublicUser[]> => {
  const users = await db.users.filter((u) => u.isDemo).toArray()
  const order: Role[] = ['lyceen', 'conseiller', 'etablissement']
  return users.sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role)).map(toPublicUser)
}

export const getDemoAccountForRole = async (role: Role) => (await listDemoAccounts()).find((u) => u.role === role) ?? null

export const getUser = async (userId: string): Promise<PublicUser | null> => {
  const user = await db.users.get(userId)
  return user ? toPublicUser(user) : null
}

export const createSession = async (userId: string, persistent: boolean): Promise<Session> => {
  const user = await requireUser(userId)
  const now = nowIso()
  const session: Session = { id: newId('s'), userId, persistent, createdAt: now, lastSeenAt: now }
  await db.sessions.add(session)
  if (!user.isGuest) await log(user.id, user, 'connexion', persistent ? 'Connexion (session conservée sur cet appareil).' : 'Connexion.')
  return session
}

/** Retourne le compte d'une session valide, ou null si la session est inconnue ou révoquée. */
export const resolveSession = async (sessionId: string): Promise<PublicUser | null> => {
  const session = await db.sessions.get(sessionId)
  if (!session || session.revokedAt) return null
  const user = await db.users.get(session.userId)
  if (!user) return null
  await db.sessions.update(sessionId, { lastSeenAt: nowIso() })
  return toPublicUser(user)
}

/** Lecture seule (utilisable dans une requête réactive) : compte d'une session valide. */
export const peekSession = async (sessionId: string): Promise<PublicUser | null> => {
  const session = await db.sessions.get(sessionId)
  if (!session || session.revokedAt) return null
  const user = await db.users.get(session.userId)
  return user ? toPublicUser(user) : null
}

export const logout = async (sessionId: string) => {
  const session = await db.sessions.get(sessionId)
  if (!session || session.revokedAt) return
  await db.sessions.update(sessionId, { revokedAt: nowIso() })
  const user = await db.users.get(session.userId)
  if (user && !user.isGuest) await log(user.id, user, 'deconnexion', 'Déconnexion.')
}

/** Mode invité : un compte local sans identifiants, distinct des comptes. */
export const getOrCreateGuest = async (existingGuestId?: string | null): Promise<PublicUser> => {
  if (existingGuestId) {
    const existing = await db.users.get(existingGuestId)
    if (existing?.isGuest) return toPublicUser(existing)
  }
  const id = newId('guest')
  const now = nowIso()
  const guest: User = {
    id,
    email: `${id}@invite.local`,
    firstName: 'Invité',
    lastName: '',
    role: 'lyceen',
    credential: null,
    isDemo: false,
    isGuest: true,
    onboarded: true,
    createdAt: now,
  }
  await db.transaction('rw', [db.users, db.studentProfiles], async () => {
    await db.users.add(guest)
    await db.studentProfiles.add({
      userId: id,
      classe: 'Lycée',
      interests: {},
      specialites: [],
      alternance: false,
      grades: {},
      useGrades: false,
      completedSteps: [],
      updatedAt: now,
    })
  })
  return toPublicUser(guest)
}

/**
 * Réinitialisation simulée : aucune donnée n'est envoyée.
 * La réponse est identique que le compte existe ou non, pour ne rien révéler.
 */
export const requestPasswordReset = async (rawEmail: string) => {
  if (!rawEmail.trim()) throw new AuthError('Indiquez votre adresse e-mail.', 'email')
  if (!isValidEmail(rawEmail)) throw new AuthError('Adresse e-mail invalide : vérifiez le format.', 'email')
  return 'Si un compte correspond à cette adresse, vous recevrez un lien de réinitialisation. Prototype : aucun e-mail n’est réellement envoyé.'
}

export const completeOnboarding = async (userId: string) => {
  await requireUser(userId)
  await db.users.update(userId, { onboarded: true })
}
