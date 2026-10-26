import type { PasswordCredential } from '../types'

/**
 * Hachage local des mots de passe : PBKDF2 / SHA-256 via Web Crypto.
 * 600 000 itérations, recommandation OWASP 2023 pour PBKDF2-HMAC-SHA256.
 * Le nombre d'itérations est stocké avec chaque compte pour permettre une évolution.
 */
export const PBKDF2_ITERATIONS = 600_000
const SALT_BYTES = 16
const HASH_BITS = 256

const toBase64 = (bytes: Uint8Array) => {
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

const fromBase64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0))

const derive = async (password: string, salt: Uint8Array, iterations: number) => {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    HASH_BITS,
  )
  return new Uint8Array(bits)
}

export const hashPassword = async (password: string, iterations = PBKDF2_ITERATIONS): Promise<PasswordCredential> => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hash = await derive(password, salt, iterations)
  return { algorithm: 'PBKDF2-SHA-256', iterations, salt: toBase64(salt), hash: toBase64(hash) }
}

/** Comparaison en temps constant du résultat dérivé. */
export const verifyPassword = async (password: string, credential: PasswordCredential) => {
  const candidate = await derive(password, fromBase64(credential.salt), credential.iterations)
  const expected = fromBase64(credential.hash)
  if (candidate.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < candidate.length; i += 1) diff |= candidate[i] ^ expected[i]
  return diff === 0
}

export const PASSWORD_MIN_LENGTH = 8
