import { expect, type Page } from '@playwright/test'

export const go = (page: Page, path: string) => page.goto(`./#${path}`)

/** Connexion en un clic avec un compte de démonstration (Léa, Gabriel, Alain). */
export const loginDemo = async (page: Page, firstName: 'Léa' | 'Gabriel' | 'Alain') => {
  await go(page, '/connexion')
  await page.getByRole('button', { name: new RegExp(`en tant que ${firstName}`) }).click()
  await expect(page).not.toHaveURL(/#\/connexion/)
}

export const logout = async (page: Page) => {
  await page.getByRole('button', { name: /menu du compte/ }).click()
  await page.getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/#\/connexion/)
}

/** Vérifie la route courante ; les paramètres de requête (ex. ?fiche=…) sont acceptés. */
export const expectPath = (page: Page, path: string) => expect(page).toHaveURL(new RegExp(`#${path.replace(/\//g, '\\/')}(\\?.*)?$`))
