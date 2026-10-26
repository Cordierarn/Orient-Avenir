/** Erreurs métier renvoyées par les repositories, avec un message destiné à l'utilisateur. */
export class RepositoryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RepositoryError'
  }
}

export class AccessDeniedError extends RepositoryError {
  constructor(message = 'Vous n’avez pas accès à ces données.') {
    super(message)
    this.name = 'AccessDeniedError'
  }
}

/** Action réservée aux comptes : jamais simulée en mode invité. */
export class GuestForbiddenError extends RepositoryError {
  constructor(message = 'Cette fonctionnalité nécessite un compte.') {
    super(message)
    this.name = 'GuestForbiddenError'
  }
}

export class NotFoundError extends RepositoryError {
  constructor(message = 'Élément introuvable.') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ValidationError<F extends string = string> extends RepositoryError {
  fieldErrors: Partial<Record<F, string>>
  constructor(message: string, fieldErrors: Partial<Record<F, string>> = {}) {
    super(message)
    this.name = 'ValidationError'
    this.fieldErrors = fieldErrors
  }
}

export class AuthError extends RepositoryError {
  field?: 'email' | 'password'
  constructor(message: string, field?: 'email' | 'password') {
    super(message)
    this.name = 'AuthError'
    this.field = field
  }
}

export const errorMessage = (error: unknown, fallback: string) =>
  error instanceof RepositoryError ? error.message : fallback
