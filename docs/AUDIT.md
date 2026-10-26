# Audit du dépôt et des maquettes

Audit réalisé le 26/10/2026, avant les évolutions de la branche `feat/finalisation-orient-avenir`.

## 1. État Git au démarrage

- Branche `main`, à jour avec `origin/main` (dernier commit `713d72b`, fusion de la PR #1 « prototype interactif »).
- Modifications locales non commitées, **conservées** dans un commit dédié (`chore: conserver le travail local existant`) avant toute évolution :
  - passage de `react-router-dom` 6 → 7 (`package.json`, `package-lock.json`) ;
  - ajout d'un état `publishedFormation` (`src/types.ts`) et évolutions de `src/App.tsx` et `src/index.css`.
- Fichiers non suivis : `OrientAvenir.pdf` (84 Mo, maquettes exportées) et `Untitled/` (30 maquettes JPG fournies ensuite). Ils sont ignorés par Git ; les maquettes sont copiées sous des noms explicites dans `docs/maquette/`.

## 2. Stack et versions

| Élément | Version | Décision |
| --- | --- | --- |
| Gestionnaire de paquets | npm 11 (`package-lock.json`) | conservé (`npm ci` en CI) |
| Node | 24 en local, 22 en CI | — |
| React / React DOM | 18.3 | conservé |
| React Router | 7 (`HashRouter`) | conservé (compatible GitHub Pages) |
| Vite | 8 | conservé, `base: '/Orient-Avenir/'` |
| TypeScript | 6.0 | conservé |
| Lint | oxlint | conservé |
| Tests unitaires | Vitest 5 | conservé, complété |
| Icônes | lucide-react | conservé |
| **Ajouts** | Dexie 4, dexie-react-hooks, fake-indexeddb (tests), @playwright/test | requis par le cahier des charges |

## 3. Architecture au démarrage

```
src/
  App.tsx            948 lignes : toutes les pages, toutes les routes
  context/AppContext.tsx  état global unique dans localStorage (aucun compte)
  components/ui.tsx  composants simplifiés (Modal sans gestion du focus, curseur natif)
  data/*.ts          données fictives (6 formations), domaines, calendrier
  lib/scoring.ts     scoring 50/30/20 (explication générique)
  tests/scoring.test.ts  2 tests
```

### Routes existantes

`/`, `/profil/interets`, `/profil/preferences`, `/profil/dossier`, `/pistes`, `/formation/:id`, `/comparer`, `/favoris`, `/rendez-vous`, `/echange`, `/echeances`, `/conseiller/demandes`, `/conseiller/eleves`, `/etablissement/fiches`, `/etablissement/chiffres`, `/etablissement/page`, `/etablissement/profils`, puis redirection pour toute autre route.

### Constats

| Domaine | Présent | Incomplet | Absent |
| --- | --- | --- | --- |
| Authentification | — | — | comptes, sessions, hachage, routes protégées, connexion, inscription |
| Données | données fictives en dur | 6 formations seulement | IndexedDB, repositories, seed versionné, isolation des comptes |
| Lycéen | questionnaire, pistes, comparaison, favoris | rendez-vous et messagerie simulés en mémoire | persistance par compte, consentements datés, échéances 2027 complètes |
| Conseiller | 2 pages | contenus statiques | demandes réelles, accès conditionné au consentement, notes |
| Établissement | 4 pages | publication simulée | validation de publication, chiffres agrégés réels, profils consentis |
| Découverte | — | — | page partagée, filtres, tri |
| Design system | tokens partiels | composants non accessibles | Stepper, Toast, Header, MobileTabBar, focus des modales |
| Responsive | — | — | barre d'onglets mobile, fiche plein écran |
| 404 | — | — | page dédiée |
| Tests / CI | 2 tests Vitest, déploiement Pages | — | lint, typage et tests dans la CI, tests end-to-end |

Résultat des commandes au démarrage : `oxlint` 1 avertissement, `tsc -b` OK, `vitest` 2/2, `vite build` OK.

## 4. Inventaire des maquettes (`docs/maquette/`)

| Fichier | Route | Rôle | Viewport | État représenté |
| --- | --- | --- | --- | --- |
| 00-connexion.jpg | `/connexion` | public | desktop 1440 | formulaire, panneau bleu (export défectueux : pastilles et encart éthique blancs, liens qui se chevauchent) |
| 00-connexion-mobile.jpg | `/connexion` | public | mobile 390 | connexion mobile |
| 01-design-system.jpg | — | — | planche | couleurs, typographie, icônes, composants |
| 02-accueil.jpg | `/` | lycéen | desktop | accueil, aperçu d'une piste |
| 03-profil-interets.jpg | `/profil/interets` | lycéen | desktop | étape 1 sur 4 |
| 04-profil-preferences.jpg | `/profil/preferences` | lycéen | desktop | étape 2 sur 4 |
| 05-profil-dossier.jpg | `/profil/dossier` | lycéen | desktop | étape 3 sur 4, facultative |
| 06-pistes.jpg | `/pistes` | lycéen | desktop | 3 pistes, piste d'ouverture, barre de sélection |
| 07-fiche-formation-modale.jpg | `/formation/:id` | lycéen | desktop | fiche en fenêtre modale |
| 08-comparer.jpg | `/comparer` | lycéen | desktop | 3 formations, lignes « Écart » |
| 09-favoris-partage.jpg | `/favoris` | lycéen | desktop | panneau de partage |
| 10-rendez-vous.jpg | `/rendez-vous` | lycéen | desktop | créneaux, conseillers proposés |
| 11-favoris-rdv-confirme.jpg | `/favoris` | lycéen | desktop | rendez-vous confirmé, suivi |
| 12-echange.jpg | `/echange` | lycéen | desktop | messagerie |
| 13-echeances.jpg | `/echeances` | lycéen | desktop | calendrier 2027, rappels |
| 14-decouverte-lyceen.jpg | `/decouverte` | lycéen | desktop | recherche « informatique » |
| 15-conseiller-demandes.jpg | `/conseiller/demandes` | conseiller | desktop | 3 demandes |
| 16-conseiller-eleve.jpg | `/conseiller/eleves/:id` | conseiller | desktop | dossier de Léa |
| 17-conseiller-eleve-note-enregistree.jpg | `/conseiller/eleves/:id` | conseiller | desktop | note enregistrée |
| 18-decouverte-conseiller.jpg | `/conseiller/decouverte` | conseiller | desktop | identique à 14 |
| 19-etablissement-fiche-incomplete.jpg | `/etablissement/fiches` | établissement | desktop | brouillon incomplet |
| 20-etablissement-fiche-erreurs.jpg | `/etablissement/fiches` | établissement | desktop | publication bloquée |
| 21-etablissement-fiche-publiee-chiffres.jpg | `/etablissement/fiches` | établissement | desktop | fiche publiée + chiffres d'intérêt |
| 22-etablissement-page-ecole.jpg | `/etablissement/page` | établissement | desktop | page publique de l'école |
| 23-etablissement-profils.jpg | `/etablissement/profils` | établissement | desktop | profils consentis |
| 24-decouverte-etablissement.jpg | `/etablissement/decouverte` | établissement | desktop | identique à 14 |
| 25-mobile-accueil.jpg | `/` | lycéen | mobile 390 | accueil mobile |
| 26-mobile-pistes.jpg | `/pistes` | lycéen | mobile 390 | pistes, barre d'onglets |
| 27-mobile-fiche.jpg | `/formation/:id` | lycéen | mobile 390 | fiche plein écran |
| 99-erreur-404.jpg | toute route inconnue | tous | desktop | erreur 404 |

Les textes exacts ont été extraits du PDF source (`OrientAvenir.pdf`) et repris dans l'interface.

## 5. Risques techniques identifiés

1. **Réécriture du monolithe** : `App.tsx` mélangeait toutes les pages et un état global non persistant par compte. Une évolution incrémentale était impossible sans découper ; les routes et les noms de pages ont été conservés.
2. **Hachage dans le navigateur** : PBKDF2 à 600 000 itérations coûte environ 150 ms par dérivation ; acceptable avec un état de chargement.
3. **Réactivité entre rôles** : les vues doivent refléter immédiatement les écritures d'un autre compte (même onglet ou autre onglet) → `useLiveQuery` de Dexie, encapsulé dans `src/hooks/useRepo.ts`.
4. **Isolation et confidentialité** : la protection des moyennes doit être garantie dans les repositories, pas seulement dans l'interface → projections dédiées et tests de confidentialité.
5. **GitHub Pages** : pas de réécriture d'URL côté serveur → `HashRouter` conservé, `base` Vite vérifiée par les tests end-to-end sur le build de production.

## 6. Stratégie d'évolution retenue

1. Conserver la stack, les routes et le nommage existants ; découper `App.tsx` en pages, couches et composants.
2. Créer la couche de données (Dexie, seed versionné, repositories avec contrôle d'accès par rôle) et la tester avant l'interface.
3. Construire un design system centralisé (`src/styles/tokens.css`, `src/components/*`).
4. Implémenter les espaces lycéen, conseiller et établissement, puis Découverte et le mobile.
5. Valider avec des tests unitaires, des tests end-to-end, des captures comparées aux maquettes et une CI qui bloque le déploiement en cas d'échec.
