// Génère une empreinte PBKDF2-SHA-256 (sel aléatoire) pour le seed des comptes de démonstration.
// Usage : node scripts/hash-password.mjs <mot-de-passe> [nombre-de-comptes]
// Le mot de passe n'est jamais écrit dans le dépôt : seules les empreintes le sont.
const [password, countArg = '1'] = process.argv.slice(2)
if (!password) {
  console.error('Usage : node scripts/hash-password.mjs <mot-de-passe> [nombre-de-comptes]')
  process.exit(1)
}
const ITERATIONS = 600_000
const toBase64 = (bytes) => Buffer.from(bytes).toString('base64')

for (let i = 0; i < Number(countArg); i += 1) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256)
  console.log(JSON.stringify({ algorithm: 'PBKDF2-SHA-256', iterations: ITERATIONS, salt: toBase64(salt), hash: toBase64(new Uint8Array(bits)) }))
}
