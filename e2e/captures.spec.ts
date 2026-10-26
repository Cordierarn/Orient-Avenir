import { expect, test, type Page } from '@playwright/test'
import { go, loginDemo, logout } from './helpers'

/**
 * Captures de l'implémentation, une par maquette de docs/maquette, au même viewport.
 * Lancement : CAPTURES=1 npx playwright test --project=captures
 */
test.skip(!process.env.CAPTURES, 'Captures générées uniquement avec CAPTURES=1')
test.describe.configure({ mode: 'serial' })

const DESKTOP = { width: 1440, height: 1024 }
const MOBILE = { width: 390, height: 844 }

const shot = async (page: Page, name: string, fullPage = true) => {
  await page.waitForTimeout(400)
  await page.screenshot({ path: `docs/captures/${name}.jpg`, fullPage, type: 'jpeg', quality: 70 })
}

test('desktop : connexion et 404', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await go(page, '/connexion')
  await shot(page, '00-connexion')
  await go(page, '/page-inconnue')
  await shot(page, '99-erreur-404')
})

test('desktop : espace lycéen', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await loginDemo(page, 'Léa')
  for (const [name, path] of [
    ['02-accueil', '/'],
    ['03-profil-interets', '/profil/interets'],
    ['04-profil-preferences', '/profil/preferences'],
    ['05-profil-dossier', '/profil/dossier'],
    ['06-pistes', '/pistes'],
    ['08-comparer', '/comparer'],
    ['13-echeances', '/echeances'],
    ['14-decouverte-lyceen', '/decouverte?q=informatique'],
  ]) {
    await go(page, path)
    await shot(page, name)
  }
  await go(page, '/formation/f-but-info')
  await expect(page.getByRole('dialog')).toBeVisible()
  await shot(page, '07-fiche-formation-modale', false)
  await page.keyboard.press('Escape')
  // État « partage » des favoris et formulaire de rendez-vous : sans demande en cours.
  await go(page, '/favoris')
  await page.getByRole('button', { name: 'Annuler la demande' }).click()
  await expect(page.getByRole('heading', { name: 'Préparer l’échange avec un conseiller' })).toBeVisible()
  await shot(page, '09-favoris-partage')
  await go(page, '/rendez-vous')
  const slots = page.getByRole('checkbox', { name: /h – / })
  await slots.nth(2).check()
  await slots.nth(7).check()
  await slots.nth(11).check()
  await page.getByRole('radio', { name: 'Je préfère Gabriel' }).check()
  await page.getByLabel('Ce que vous souhaitez aborder (facultatif)').fill('Je n’arrive pas à choisir entre une licence, un BUT et une école d’ingénieurs.')
  await shot(page, '10-rendez-vous')
  await page.getByRole('button', { name: 'Envoyer ma demande' }).click()
  await expect(page.getByRole('heading', { name: 'Votre demande est en attente' })).toBeVisible()
  await logout(page)

  // Gabriel accepte et écrit, puis retour chez Léa.
  await loginDemo(page, 'Gabriel')
  await page.getByRole('article').filter({ hasText: 'Léa D.' }).getByRole('radio').nth(1).check()
  await page.getByRole('article').filter({ hasText: 'Léa D.' }).getByRole('button', { name: 'Accepter ce créneau' }).click()
  await expect(page.getByText('Créneau accepté')).toBeVisible()
  await go(page, '/conseiller/eleves/u-lea')
  await page.getByRole('button', { name: 'Ouvrir l’échange' }).click()
  await page.getByLabel('Écrire un message à Léa').fill('Bonjour Léa, j’ai lu ton dossier. Tu hésites entre licence, BUT et école d’ingénieurs : on en parle à notre rendez-vous ?')
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await logout(page)
  await loginDemo(page, 'Léa')
  await go(page, '/echange')
  await page.getByLabel('Écrire un message à Gabriel').fill('Oui, merci ! Surtout, je ne sais pas si je préfère une formation pratique ou plus théorique.')
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByRole('log')).toContainText('Oui, merci')
  await shot(page, '12-echange')
  await go(page, '/favoris')
  await expect(page.getByRole('heading', { name: 'Rendez-vous confirmé' })).toBeVisible()
  await shot(page, '11-favoris-rdv-confirme')
})

test('desktop : espace conseiller', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await loginDemo(page, 'Gabriel')
  await shot(page, '15-conseiller-demandes')
  await go(page, '/conseiller/eleves/u-lea')
  await shot(page, '16-conseiller-eleve')
  await page.getByLabel('Note de suivi (visible par vous seul)').fill('Proposer une visite de l’IUT de Valmont aux portes ouvertes. Revoir ensemble le niveau de maths attendu.')
  await page.getByRole('button', { name: /Enregistrer/ }).click()
  await expect(page.getByText('Note enregistrée')).toBeVisible()
  await shot(page, '17-conseiller-eleve-note-enregistree')
  await go(page, '/conseiller/decouverte?q=informatique')
  await shot(page, '18-decouverte-conseiller')
})

test('desktop : espace établissement', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await loginDemo(page, 'Alain')
  await shot(page, '19-etablissement-fiche-incomplete')
  await page.getByRole('button', { name: 'Publier la fiche' }).click()
  await expect(page.getByText('2 rubriques à compléter avant publication')).toBeVisible()
  await shot(page, '20-etablissement-fiche-erreurs')
  await page.getByRole('button', { name: 'Remplir avec un exemple (démo)' }).click()
  await page.getByRole('button', { name: 'Publier la fiche' }).click()
  await expect(page.getByText('Fiche publiée', { exact: true })).toBeVisible()
  await shot(page, '21-etablissement-fiche-publiee-chiffres')
  for (const [name, path] of [
    ['22-etablissement-page-ecole', '/etablissement/page'],
    ['23-etablissement-profils', '/etablissement/profils'],
    ['24-decouverte-etablissement', '/etablissement/decouverte?q=informatique'],
  ]) {
    await go(page, path)
    await shot(page, name)
  }
})

test('mobile : connexion, accueil, pistes, fiche', async ({ page }) => {
  await page.setViewportSize(MOBILE)
  await go(page, '/connexion')
  await shot(page, '00-connexion-mobile', false)
  await loginDemo(page, 'Léa')
  await go(page, '/')
  await shot(page, '25-mobile-accueil', false)
  await go(page, '/pistes')
  await shot(page, '26-mobile-pistes', false)
  await go(page, '/formation/f-but-info')
  await expect(page.getByRole('dialog')).toBeVisible()
  await shot(page, '27-mobile-fiche', false)
})
