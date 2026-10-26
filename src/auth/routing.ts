import type { PublicUser, Role } from '../types'

/** Rôle requis par un chemin interne. null : accessible à tout compte connecté. */
export const roleForPath = (pathname: string): Role | null => {
  if (pathname.startsWith('/conseiller')) return 'conseiller'
  if (pathname.startsWith('/etablissement')) return 'etablissement'
  if (pathname.startsWith('/compte') || pathname.startsWith('/ecole')) return null
  return 'lyceen'
}

export const isPathAllowed = (pathname: string, role: Role) => {
  const required = roleForPath(pathname)
  return required === null || required === role
}

/** Accueil par défaut d'un compte, en tenant compte du parcours de première connexion. */
export const homeFor = (user: Pick<PublicUser, 'role' | 'onboarded' | 'institutionId'>) => {
  if (user.role === 'conseiller') return user.onboarded ? '/conseiller/demandes' : '/conseiller/profil'
  if (user.role === 'etablissement') return user.institutionId ? '/etablissement/fiches' : '/etablissement/rattachement'
  return '/'
}

export const ROLE_HOME: Record<Role, string> = {
  lyceen: '/',
  conseiller: '/conseiller/demandes',
  etablissement: '/etablissement/fiches',
}
