import { expect, test } from '@playwright/test'
import { go, loginDemo } from './helpers'

test('mobile : barre d’onglets, fiche plein écran et aucun débordement à 390 px', async ({ page }) => {
  await loginDemo(page, 'Léa')
  const tabbar = page.getByRole('navigation', { name: 'Navigation mobile' })
  await expect(tabbar).toBeVisible()
  for (const name of ['Profil', 'Pistes', 'Comparer', 'Favoris']) await expect(tabbar.getByRole('link', { name })).toBeVisible()
  await tabbar.getByRole('link', { name: 'Pistes' }).click()
  await expect(page.getByRole('heading', { name: 'Vos pistes' })).toBeVisible()

  await go(page, '/formation/f-but-info')
  const dialog = page.getByRole('dialog', { name: 'BUT Informatique' })
  await expect(dialog).toBeVisible()
  const box = await dialog.boundingBox()
  expect(box?.width).toBe(390)
  await expect(dialog.getByRole('button', { name: /Dans mes favoris|Ajouter aux favoris/ })).toBeInViewport()

  for (const path of ['/', '/pistes', '/comparer', '/favoris', '/echeances', '/decouverte']) {
    await go(page, path)
    await page.waitForTimeout(300)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  }
})

test('mobile : menu du compte accessible au toucher', async ({ page }) => {
  await loginDemo(page, 'Léa')
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
  const drawer = page.getByRole('dialog', { name: 'Menu' })
  await expect(drawer.getByRole('button', { name: 'Se déconnecter' })).toBeVisible()
  await drawer.getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/#\/connexion/)
})
