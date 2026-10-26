import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Chemin du dépôt sur GitHub Pages : https://<compte>.github.io/Orient-Avenir/
  base: '/Orient-Avenir/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    setupFiles: ['tests/unit/setup.ts'],
    // PBKDF2 à 600 000 itérations : on laisse de la marge aux tests d'authentification.
    testTimeout: 20_000,
  },
})
