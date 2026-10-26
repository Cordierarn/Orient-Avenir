import { expect, test } from '@playwright/test'
import { expectPath, go, loginDemo, logout } from './helpers'

test.describe('Parcours 1 : questionnaire, pistes, comparaison et favoris de Léa', () => {
  test('les réponses, la comparaison et les favoris persistent après rechargement', async ({ page }) => {
    await loginDemo(page, 'Léa')
    await expectPath(page, '/')
    // En desktop, la barre d'onglets mobile n'est pas affichée.
    await expect(page.getByRole('navigation', { name: 'Navigation mobile' })).toBeHidden()

    // Questionnaire : modification d'une réponse au clavier.
    await page.getByRole('link', { name: 'Reprendre le questionnaire' }).click()
    await expectPath(page, '/profil/interets')
    const sante = page.getByRole('slider', { name: 'Santé et soin' })
    await expect(sante).toHaveAttribute('aria-valuetext', 'Un peu')
    await sante.focus()
    await page.keyboard.press('End')
    await expect(sante).toHaveAttribute('aria-valuetext', 'Passionnément')
    await page.getByRole('button', { name: 'Continuer' }).click()
    await expectPath(page, '/profil/preferences')
    await page.getByRole('button', { name: 'Continuer' }).click()
    await expectPath(page, '/profil/dossier')
    await page.getByRole('button', { name: 'Voir mes pistes' }).click()
    await expectPath(page, '/pistes')

    // Pistes : trois meilleures pistes et piste d'ouverture distincte.
    await expect(page.getByRole('heading', { name: 'Vos pistes à explorer' })).toBeVisible()
    await expect(page.getByText('Piste d’ouverture')).toBeVisible()
    await expect(page.getByText(/jamais une chance d’admission|n’est pas une chance d’admission/).first()).toBeVisible()

    // Comparaison : on repart de zéro puis on sélectionne deux formations.
    await go(page, '/comparer')
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: /^Retirer .* de la comparaison$/ }).first().click()
    await expect(page.getByRole('heading', { name: 'Aucune formation à comparer' })).toBeVisible()
    await go(page, '/pistes')
    await page.getByRole('checkbox', { name: 'Comparer BUT Informatique' }).check()
    await page.getByRole('checkbox', { name: 'Comparer Licence Informatique' }).check()
    const bar = page.getByRole('region', { name: 'Sélection pour la comparaison' })
    await expect(bar).toContainText('2 formations sélectionnées')
    await bar.getByRole('link', { name: 'Comparer' }).click()
    await expectPath(page, '/comparer')
    await expect(page.getByRole('heading', { name: 'Comparer 2 formations' })).toBeVisible()
    await expect(page.getByText('Écart').first()).toBeVisible()

    // Favori depuis la fiche formation (fenêtre modale).
    await go(page, '/pistes')
    await page.getByRole('article').filter({ hasText: 'Cycle ingénieur post-bac' }).getByRole('button', { name: 'Voir la fiche' }).click()
    const dialog = page.getByRole('dialog', { name: 'Cycle ingénieur post-bac' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Repères des années passées')).toBeVisible()
    await dialog.getByRole('button', { name: 'Ajouter aux favoris' }).click()
    await expect(dialog.getByRole('button', { name: 'Dans mes favoris' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    // Rechargement : tout est relu depuis IndexedDB.
    await page.reload()
    await expect(page.getByRole('link', { name: 'Favoris (3)' })).toBeVisible()
    await go(page, '/comparer')
    await expect(page.getByRole('heading', { name: 'Comparer 2 formations' })).toBeVisible()
    await go(page, '/profil/interets')
    await expect(page.getByRole('slider', { name: 'Santé et soin' })).toHaveAttribute('aria-valuetext', 'Passionnément')
  })
})

test.describe('Parcours 2 : partage, rendez-vous et messagerie entre Léa et Gabriel', () => {
  test('la demande de Léa est acceptée par Gabriel et confirmée côté Léa', async ({ page }) => {
    await loginDemo(page, 'Léa')
    await go(page, '/favoris')
    // La démo démarre avec une demande en attente : on l'annule pour refaire le parcours complet.
    await page.getByRole('button', { name: 'Annuler la demande' }).click()
    await expect(page.getByRole('heading', { name: 'Préparer l’échange avec un conseiller' })).toBeVisible()

    // Partage explicite : retrait puis accord.
    await page.getByRole('checkbox', { name: 'J’accepte ce partage' }).uncheck()
    await page.getByRole('button', { name: 'Mettre à jour mes choix' }).click()
    await expect(page.getByText('Non partagé')).toBeVisible()
    await page.getByRole('checkbox', { name: 'J’accepte ce partage' }).check()
    await page.getByRole('button', { name: 'Partager mon dossier' }).click()
    await expect(page.getByText(/Dossier partagé le/)).toBeVisible()

    // Demande de rendez-vous.
    await page.getByRole('button', { name: 'Demander un rendez-vous' }).click()
    await expectPath(page, '/rendez-vous')
    await page.getByRole('button', { name: 'Envoyer ma demande' }).click()
    await expect(page.getByText(/Cochez au moins deux créneaux \(0 sélectionné\)/).first()).toBeVisible()
    const slots = page.getByRole('checkbox', { name: /17 h – 18 h/ })
    await slots.nth(0).check()
    await slots.nth(2).check()
    await page.getByRole('radio', { name: 'Je préfère Gabriel' }).check()
    await page.getByLabel('Ce que vous souhaitez aborder (facultatif)').fill('Je n’arrive pas à choisir entre une licence, un BUT et une école d’ingénieurs.')
    await page.getByRole('button', { name: 'Envoyer ma demande' }).click()
    await expect(page.getByRole('heading', { name: 'Votre demande est en attente' })).toBeVisible()
    await logout(page)

    // Côté conseiller.
    await loginDemo(page, 'Gabriel')
    await expectPath(page, '/conseiller/demandes')
    const card = page.getByRole('article').filter({ hasText: 'Léa D.' })
    await expect(card).toContainText('Correspond à vos domaines : numérique')
    await expect(card).toContainText('Je n’arrive pas à choisir')
    await card.getByRole('radio').nth(1).check()
    await card.getByRole('button', { name: 'Accepter ce créneau' }).click()
    await expect(page.getByText('Créneau accepté')).toBeVisible()
    await expect(page.getByRole('article').filter({ hasText: 'Léa D.' })).toHaveCount(0)
    await logout(page)

    // Retour chez Léa : rendez-vous confirmé.
    await loginDemo(page, 'Léa')
    await go(page, '/favoris')
    await expect(page.getByRole('heading', { name: 'Rendez-vous confirmé' })).toBeVisible()
    await expect(page.getByText('Gabriel a accepté votre demande')).toBeVisible()
  })

  test('messages persistants, puis retrait du consentement visible côté conseiller', async ({ page }) => {
    // Gabriel accepte la demande initiale de Léa.
    await loginDemo(page, 'Gabriel')
    await page.getByRole('article').filter({ hasText: 'Léa D.' }).getByRole('button', { name: 'Accepter ce créneau' }).click()
    await expect(page.getByText('Créneau accepté')).toBeVisible()
    await logout(page)

    // Léa écrit à Gabriel.
    await loginDemo(page, 'Léa')
    await go(page, '/echange')
    await expect(page.getByRole('heading', { name: 'Mon échange avec Gabriel' })).toBeVisible()
    await page.getByLabel('Écrire un message à Gabriel').fill('Bonjour Gabriel, merci pour le créneau !')
    await page.getByRole('button', { name: 'Envoyer' }).click()
    await expect(page.getByRole('log')).toContainText('Bonjour Gabriel, merci pour le créneau !')
    await logout(page)

    // Gabriel lit et répond depuis le dossier.
    await loginDemo(page, 'Gabriel')
    await go(page, '/conseiller/eleves/u-lea')
    await expect(page.getByRole('heading', { name: 'Léa D.' })).toBeVisible()
    await expect(page.getByText('Mathématiques, NSI').first()).toBeVisible()
    await expect(page.getByText('14,5')).toHaveCount(0)
    await page.getByRole('button', { name: 'Ouvrir l’échange' }).click()
    await expect(page.getByRole('log')).toContainText('Bonjour Gabriel, merci pour le créneau !')
    await page.getByLabel('Écrire un message à Léa').fill('Avec plaisir, à bientôt.')
    await page.getByRole('button', { name: 'Envoyer' }).click()
    await expect(page.getByRole('log')).toContainText('Avec plaisir, à bientôt.')
    await logout(page)

    // Léa retrouve la conversation après rechargement puis retire son partage.
    await loginDemo(page, 'Léa')
    await go(page, '/echange')
    await page.reload()
    const log = page.getByRole('log')
    await expect(log).toContainText('Bonjour Gabriel, merci pour le créneau !')
    await expect(log).toContainText('Avec plaisir, à bientôt.')
    await go(page, '/favoris')
    await page.getByRole('button', { name: 'Retirer le partage' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Retirer le partage' }).click()
    await expect(page.getByText('Partage retiré', { exact: true })).toBeVisible()
    await logout(page)

    // Le dossier devient immédiatement inaccessible côté conseiller.
    await loginDemo(page, 'Gabriel')
    await go(page, '/conseiller/eleves')
    await expect(page.getByRole('link', { name: /Léa D\./ })).toHaveCount(0)
    await go(page, '/conseiller/eleves/u-lea')
    await expect(page.getByText('Dossier inaccessible')).toBeVisible()
    await expect(page.getByText('Mathématiques, NSI')).toHaveCount(0)
  })
})

test.describe('Parcours 3 : inscription d’un nouveau lycéen', () => {
  test('les réponses sont conservées après déconnexion et reconnexion', async ({ page }) => {
    await go(page, '/inscription')
    await page.getByRole('button', { name: 'Créer mon compte' }).click()
    await expect(page.getByText('Indiquez votre prénom.')).toBeVisible()
    await page.getByRole('radio', { name: /Lycéen/ }).check()
    await page.getByLabel('Prénom').fill('Camille')
    await page.getByLabel(/^Nom/).fill('Martin')
    await page.getByLabel('Adresse e-mail').fill('LEA.D@exemple.fr')
    await page.getByLabel(/^Mot de passe/).fill('court')
    await page.getByLabel('Confirmation du mot de passe').fill('autre')
    await page.getByLabel('Prénom').click()
    await expect(page.getByText(/Un compte existe déjà avec cette adresse/)).toBeVisible()
    await expect(page.getByText('Le mot de passe doit contenir au moins 8 caractères (actuellement 5).')).toBeVisible()
    await expect(page.getByText('Les deux mots de passe ne sont pas identiques.')).toBeVisible()
    await expect(page.getByText('Prototype : comptes stockés uniquement dans ce navigateur')).toBeVisible()

    await page.getByLabel('Adresse e-mail').fill('camille.martin@exemple.fr')
    await page.getByLabel(/^Mot de passe/).fill('motdepasse')
    await page.getByLabel('Confirmation du mot de passe').fill('motdepasse')
    await page.getByRole('checkbox', { name: /J’accepte les conditions/ }).check()
    await page.getByRole('button', { name: 'Créer mon compte' }).click()
    await expectPath(page, '/profil/interets')

    // Profil vide : aucun niveau renseigné.
    const numerique = page.getByRole('slider', { name: 'Numérique et code' })
    await expect(numerique).toHaveAttribute('aria-valuetext', 'Non renseigné')
    await numerique.focus()
    await page.keyboard.press('End')
    await page.getByRole('slider', { name: 'Langues et cultures' }).focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.getByRole('button', { name: 'Enregistrer et reprendre plus tard' }).click()
    await expect(page.getByText('Vos intérêts sont enregistrés')).toBeVisible()
    // Isolation : aucun favori de Léa chez Camille.
    await expect(page.getByRole('link', { name: 'Favoris (0)' })).toBeVisible()
    await logout(page)

    // Reconnexion manuelle (session temporaire).
    await page.getByLabel('Adresse e-mail').fill('camille.martin@exemple.fr')
    await page.getByLabel('Mot de passe').fill('mauvais-mdp')
    await page.getByRole('checkbox', { name: 'Rester connecté' }).uncheck()
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
    await expect(page.getByText(/Mot de passe incorrect/)).toBeVisible()
    await page.getByLabel('Mot de passe').fill('motdepasse')
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
    await expectPath(page, '/')
    await go(page, '/profil/interets')
    await expect(page.getByRole('slider', { name: 'Numérique et code' })).toHaveAttribute('aria-valuetext', 'Passionnément')
    await expect(page.getByRole('slider', { name: 'Langues et cultures' })).toHaveAttribute('aria-valuetext', 'Un peu')
    await expect(page.getByRole('slider', { name: 'Santé et soin' })).toHaveAttribute('aria-valuetext', 'Non renseigné')
  })
})

test.describe('Parcours 4 : publication d’une fiche par Alain Aubert', () => {
  test('la publication est bloquée puis la fiche apparaît dans Découverte côté lycéen', async ({ page }) => {
    await loginDemo(page, 'Alain')
    await expectPath(page, '/etablissement/fiches')
    await expect(page.getByRole('heading', { name: 'Prépa intégrée' })).toBeVisible()
    await page.getByRole('button', { name: 'Publier la fiche' }).click()
    await expect(page.getByText('2 rubriques à compléter avant publication')).toBeVisible()
    await expect(page.getByText('Débouchés et point de vigilance sont obligatoires pour informer les lycéens. Vos autres saisies sont conservées.')).toBeVisible()
    await expect(page.getByText('Indiquez au moins un métier ou une poursuite d’études.')).toBeVisible()
    await expect(page.getByText('Indiquez une difficulté ou un point d’attention pour les futurs étudiants.')).toBeVisible()
    await expect(page.getByLabel('Débouchés')).toHaveAttribute('aria-invalid', 'true')

    await page.getByLabel('Débouchés').fill('Ingénieur en numérique, énergie ou industrie. 92 % en emploi six mois après le diplôme (chiffre fictif).')
    await page.getByLabel('Point de vigilance').fill('Rythme soutenu en mathématiques et physique. Frais de 2 500 € par an (fictifs), bourses possibles.')
    await page.getByRole('button', { name: 'Publier la fiche' }).click()
    await expect(page.getByText('Fiche publiée', { exact: true })).toBeVisible()
    await expect(page.getByText(/Publiée le/)).toBeVisible()
    // La fiche publiée reste affichée même si la liste se réordonne.
    await expect(page.getByRole('heading', { name: 'Prépa intégrée', level: 2 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mettre à jour la fiche' })).toBeVisible()

    // Changement de compte vers Léa (démo, bascule directe).
    await page.getByRole('button', { name: /menu du compte/ }).click()
    await page.getByRole('button', { name: 'Changer de compte' }).click()
    await page.getByRole('dialog', { name: 'Changer de compte' }).getByRole('button', { name: /Léa D\./ }).click()
    await expectPath(page, '/')
    await go(page, '/decouverte')
    await page.getByLabel('Rechercher une formation, un établissement, un mot-clé').fill('prepa integree')
    await page.getByRole('button', { name: 'Rechercher' }).click()
    await expect(page.getByRole('heading', { name: /1 formation pour « prepa integree »/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Prépa intégrée', level: 3 })).toBeVisible()
  })
})

test.describe('Parcours 5 : route inconnue', () => {
  test('affiche la page 404 avec boutons, recherche et raccourcis', async ({ page }) => {
    await go(page, '/cette-page-nexiste-pas')
    await expect(page.getByText('Erreur 404')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Cette page s’est perdue en chemin' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Retour à l’accueil' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Voir mes pistes' })).toBeVisible()
    await expect(page.getByRole('searchbox', { name: 'Rechercher une formation, un établissement' })).toBeVisible()
    for (const name of ['Mon profil', 'Comparer', 'Échéances', 'Rendez-vous']) {
      await expect(page.getByRole('link', { name: new RegExp(`^${name}`) })).toBeVisible()
    }
    // Sans session, la recherche mène à la connexion puis à Découverte.
    await page.getByRole('searchbox').fill('informatique')
    await page.getByRole('searchbox').press('Enter')
    await expectPath(page, '/connexion')
    await page.getByRole('button', { name: /en tant que Léa/ }).click()
    await expect(page).toHaveURL(/#\/decouverte\?q=informatique$/)
    await expect(page.getByRole('heading', { name: /formations? pour « informatique »/ })).toBeVisible()
  })
})
