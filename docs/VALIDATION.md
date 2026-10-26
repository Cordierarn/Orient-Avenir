# Matrice de validation

- **Unitaires** : `tests/unit/*.test.ts` (Vitest + fake-indexeddb, via les repositories).
- **E2E** : `e2e/*.spec.ts` (Playwright, build de production servi sous `/Orient-Avenir/`).
- **Capture** : `docs/captures/<maquette>.jpg`, générée par `CAPTURES=1 npx playwright test --project=captures` au viewport de la maquette (desktop 1440 × 1024, mobile 390 × 844), puis comparée visuellement à `docs/maquette/<maquette>.jpg`.
- **Débordement** : absence de défilement horizontal vérifiée sur toutes les routes à 320, 390 et 719 px (script de contrôle ponctuel) et à 390 px dans `e2e/mobile.spec.ts`.

| Route | Rôle | Maquette | Viewport | États testés | Interactions principales | Tests | Statut | Écart |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/connexion` | public | 00-connexion, 00-connexion-mobile | 1440 / 390 | vide, erreur e-mail, mauvais mot de passe, déconnecté, route demandée | connexion manuelle, un clic démo, ENT simulé, invité | auth.test, parcours 3, sécurité (route protégée, ENT, invité) | ✅ | ECARTS § Public |
| `/inscription` | public | — | 1440 | erreurs en direct, e-mail déjà utilisé, succès | création de compte par rôle | auth.test, parcours 3 | ✅ | nouvelle route |
| `/mot-de-passe-oublie` | public | — | 1440 | e-mail invalide, confirmation neutre | demande simulée | auth.test | ✅ | nouvelle route |
| `*` (404) | tous | 99-erreur-404 | 1440 | sans session, avec session | recherche, raccourcis | parcours 5 | ✅ | ECARTS § Public |
| `/` | lycéen | 02-accueil, 25-mobile-accueil | 1440 / 390 | questionnaire vide / rempli, invité | changer d'espace | parcours 1, mobile | ✅ | 25 : cartes non compactes |
| `/profil/interets` | lycéen | 03-profil-interets | 1440 | non renseigné, rempli, enregistré | curseur clavier / souris / toucher, reprise | parcours 1, parcours 3, repositories.test | ✅ | texte d'aide |
| `/profil/preferences` | lycéen | 04-profil-preferences | 1440 | erreurs de validation, rempli | 2 spécialités max, radios | repositories.test, parcours 1 | ✅ | — |
| `/profil/dossier` | lycéen | 05-profil-dossier | 1440 | facultatif, moyenne invalide, bulletin simulé, suppression | passer l'étape | repositories.test, privacy.test | ✅ | — |
| `/pistes` | lycéen | 06-pistes, 26-mobile-pistes | 1440 / 390 | non renseigné, filtres sans résultat, sélection | filtres, tri, comparer, favori | scoring.test, parcours 1, mobile | ✅ | valeurs d'affinité calculées |
| `/formation/:id` | lycéen | 07-fiche-formation-modale, 27-mobile-fiche | 1440 / 390 | chargement, fiche retirée, favori / comparé | Échap, fermer, portes ouvertes | parcours 1, mobile | ✅ | — |
| `/comparer` | lycéen | 08-comparer | 1440 | vide, une formation, maximum 3 | retirer, favori, voir la fiche | parcours 1, repositories.test | ✅ | lignes Écart calculées |
| `/favoris` | lycéen | 09-favoris-partage, 11-favoris-rdv-confirme | 1440 | vide, partage, demande en attente, rendez-vous confirmé, invité | notes, partage, retrait | parcours 2, sécurité (invité, réinitialisation), privacy.test | ✅ | — |
| `/rendez-vous` | lycéen | 10-rendez-vous | 1440 | moins de 2 créneaux, en attente, refusée, invité | créneaux, format, conseiller | parcours 2, repositories.test | ✅ | mention de démo |
| `/echange` | lycéen | 12-echange | 1440 | non ouvert, vide, messages | envoi, format, déplacer | parcours 2 (messages), repositories.test | ✅ | visio non branchée |
| `/echeances` | lycéen | 13-echeances | 1440 | à venir / passées, rappels dus | réglages, date simulée, .ics | repositories.test (rappels), sécurité (route protégée) | ✅ | compteur |
| `/decouverte` | lycéen | 14-decouverte-lyceen | 1440 | chargement, vide, aucun résultat | recherche sans accents, filtres, tri, tout effacer | parcours 4, parcours 5 | ✅ | distance par défaut |
| `/conseiller/demandes` | conseiller | 15-conseiller-demandes | 1440 | vide, filtres, sans consentement | accepter, laisser à un autre conseiller | parcours 2, repositories.test, privacy.test | ✅ | étiquette calculée |
| `/conseiller/eleves[/:id]` | conseiller | 16-conseiller-eleve, 17-…-note-enregistree | 1440 | dossier, consentement retiré, note enregistrée | recherche, note, statut, échange | parcours 2, privacy.test | ✅ | message de note |
| `/conseiller/decouverte` | conseiller | 18-decouverte-conseiller | 1440 | identique à Découverte | fiche sans affinité | capture | ✅ | — |
| `/conseiller/profil` | conseiller | — | 1440 | premier parcours, erreurs | domaines, disponibilités | repositories (validation) | ✅ | nouvelle route |
| `/etablissement/fiches` | établissement | 19, 20, 21 | 1440 | brouillon incomplet, erreurs exactes, publiée | publier, brouillon, exemple, créer | parcours 4, repositories.test | ✅ | section « Autres informations » |
| `/etablissement/chiffres` | établissement | 21 (tableau) | 1440 | valeurs < 10 masquées | — | repositories.test, sécurité | ✅ | — |
| `/etablissement/page` | établissement | 22-etablissement-page-ecole | 1440 | aperçu (actions désactivées) | voir la fiche | capture | ✅ | sans « Ajouter aux favoris » |
| `/etablissement/profils` | établissement | 23-etablissement-profils | 1440 | consentis, retrait, vide | inviter aux portes ouvertes | privacy.test, sécurité | ✅ | total « Moins de 10 » |
| `/etablissement/decouverte` | établissement | 24-decouverte-etablissement | 1440 | identique à Découverte | — | capture | ✅ | — |
| `/etablissement/rattachement` | établissement | — | 1440 | choix ou création | — | repositories.test | ✅ | nouvelle route |
| `/compte` | tous | — | 1440 | historique, vide | — | sécurité (historique après réinitialisation) | ✅ | nouvelle route |
| `/ecole/:id` | lycéen | (22) | 1440 | événements | ajouter aux échéances | repositories (deadlines) | ✅ | nouvelle route |

## Flux entre rôles (cahier des charges § 17)

| # | Flux | Preuve |
| --- | --- | --- |
| 1–7 | Partage → demande → visible chez Gabriel → acceptation → statut mis à jour → rendez-vous confirmé chez Léa → messagerie | `e2e/parcours.spec.ts` (parcours 2), `repositories.test.ts` |
| 8 | Messages visibles après changement de compte et rechargement | parcours 2 (« messages persistants ») |
| 9–10 | Retrait du consentement → dossier inaccessible côté conseiller | parcours 2, `privacy.test.ts` |
| 11–14 | Publication → Découverte → pistes → comparateur | parcours 4, `repositories.test.ts` (« publie une fiche complète ») |
| 15 | Aucune donnée mélangée entre comptes | parcours 3 (Favoris (0)), `auth.test.ts`, `repositories.test.ts`, `privacy.test.ts` |

## Accessibilité vérifiée

- Navigation clavier : curseurs (flèches, Début, Fin), modales (focus initial, piège, Échap, restitution), menu du compte (Échap), lien d'évitement.
- Noms accessibles des boutons à icône, `aria-live` pour toasts et confirmations, erreurs reliées aux champs (`aria-describedby`, `aria-invalid`).
- Statuts : point + texte, jamais la couleur seule. Cibles d'au moins 44 px. `prefers-reduced-motion` respecté.
- Les tests E2E utilisent exclusivement des sélecteurs par rôle et nom accessible.

Limite : aucun audit automatisé (axe) ni test avec un lecteur d'écran réel n'a été mené.
