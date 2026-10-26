/** Identifiant aléatoire stable (UUID v4). */
export const newId = (prefix = '') => (prefix ? `${prefix}-${crypto.randomUUID()}` : crypto.randomUUID())

export const nowIso = () => new Date().toISOString()
