# Orient’Avenir

**Ouvre le champ des possibles.** Prototype pédagogique d’aide à l’orientation post-bac : des pistes de formation **expliquées critère par critère**, un comparateur, des favoris annotés, un échange avec un conseiller et des échéances, avec trois espaces (lycéen, conseiller, établissement) qui partagent réellement leurs données.

> ⚠️ **Prototype pédagogique.** Données fictives, stockées uniquement dans votre navigateur (IndexedDB). Authentification uniquement locale, **aucun serveur**, aucune récupération réelle de mot de passe, **aucune candidature réelle**. Le score d’affinité est un repère de discussion, **jamais une chance d’admission**. Pour candidater, utilisez la plateforme officielle.

## Prérequis

- Node.js 20.19 ou plus récent (22 recommandé), npm 10 ou plus.
- Pour les tests end-to-end : Chromium installé par Playwright (`npx playwright install chromium`).

## Installation et lancement

```bash
npm ci            # installation déterministe
npm run dev       # http://localhost:5173/Orient-Avenir/
```

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` | vérification TypeScript puis build de production (`dist/`) |
| `npm run preview` | sert le build sous `/Orient-Avenir/` |
| `npm run lint` | oxlint |
| `npm run typecheck` | TypeScript (application, tests, configuration) |
| `npm test` | tests unitaires Vitest (scoring, repositories, confidentialité, authentification) |
| `npm run test:e2e` | tests Playwright sur le build de production (desktop 1440 px et mobile 390 px) |
| `npm run test:all` | lint + types + unitaires + end-to-end |
| `CAPTURES=1 npx playwright test --project=captures` | régénère `docs/captures/` (une capture par maquette) |

## Comptes de démonstration

Connexion en un clic depuis `/connexion`, ou manuellement avec le mot de passe `demo1234`.

| Compte | Rôle | E-mail | Arrivée | État initial |
| --- | --- | --- | --- | --- |
| Léa D. | lycéenne, terminale générale Maths + NSI | `lea.d@exemple.fr` | `/` | questionnaire rempli, 2 favoris, dossier partagé, rendez-vous demandé à Gabriel |
| Gabriel B. | conseiller d’orientation indépendant | `gabriel.b@exemple.fr` | `/conseiller/demandes` | 3 demandes (Léa, Yanis, Inès), 4 dossiers partagés |
| Alain Aubert | responsable des admissions, École d’ingénieurs d’Aurelis | `a.aubert@aurelis.exemple` | `/etablissement/fiches` | 1 fiche incomplète (Prépa intégrée), 2 fiches publiées |

« Se connecter avec l’ENT de mon lycée » connecte Léa (connexion ENT simulée). « Explorer sans compte » ouvre le **mode invité** : Découverte, questionnaire, pistes, favoris et comparaison restent sur l’appareil ; partage, rendez-vous, messagerie et visibilité auprès des écoles demandent un compte (aucune réussite n’est simulée).

## Architecture

```
src/
  App.tsx                 routes (HashRouter), fiche formation en modale au-dessus de la page d'origine
  main.tsx                fournisseurs : routeur, notifications, authentification
  auth/                   session (AuthContext), stockage de session, règles de redirection par rôle
  components/             design system : Button, Tag, Status, Tabs, RoleSwitcher, Checkbox, Radio,
                          FavoriteToggle, LevelSlider, Field, Alert, Modal, EthicsBanner, CriteriaBar,
                          Stepper, Logo, MobileTabBar, Toast, états vide / chargement / erreur
  layouts/                Header, AppShell (bandeau éthique, onglets, barre mobile, rappels), gardes de routes,
                          fenêtres « Changer d'espace », « Changer de compte », « Réinitialiser »
  pages/public|student|counselor|institution|shared
  hooks/                  useRepo (lecture réactive Dexie), useAction (anti double soumission), useStudent, useToday
  db/database.ts          schéma Dexie (IndexedDB)
  db/repositories/*       SEUL accès aux données, contrôle d'accès par rôle et projections
  db/seed/*               jeu de données initial versionné (SEED_VERSION)
  lib/                    scoring, hachage PBKDF2, dates, texte, aides d'entretien, export .ics
  styles/                 tokens.css (couleurs, typographie, rayons, ombres, espacements), global.css
tests/unit/               Vitest + fake-indexeddb
e2e/                      Playwright
docs/                     AUDIT, ECARTS, VALIDATION, maquettes, captures
```

Les pages et hooks n’appellent jamais Dexie directement : ils passent par `src/db/repositories` (point d’entrée `index.ts`). Les lectures sont réactives (`useLiveQuery` encapsulé dans `useRepo`) : une écriture d’un autre rôle, dans cet onglet ou un autre, met la vue à jour immédiatement.

## Routes

Avec `HashRouter`, la route `/connexion` est servie sous `/#/connexion`.

- **Public** : `/connexion`, `/inscription`, `/mot-de-passe-oublie`, toute route inconnue → 404.
- **Lycéen** : `/`, `/profil/interets`, `/profil/preferences`, `/profil/dossier`, `/pistes`, `/formation/:id`, `/comparer`, `/favoris`, `/rendez-vous`, `/echange`, `/echeances`, `/decouverte`.
- **Conseiller** : `/conseiller/demandes`, `/conseiller/eleves`, `/conseiller/eleves/:id`, `/conseiller/decouverte`, `/conseiller/profil` (premier parcours).
- **Établissement** : `/etablissement/fiches`, `/etablissement/chiffres`, `/etablissement/page`, `/etablissement/profils`, `/etablissement/decouverte`, `/etablissement/rattachement` (premier parcours).
- **Tous les comptes** : `/compte` (historique), `/ecole/:id`.

Sans session, une route protégée redirige vers `/connexion` puis revient à la route demandée. Avec un compte d’un autre rôle, la page n’est pas rendue (aucune donnée lue) et « Changer d’espace » est proposé.

## Modèle de données

Tables IndexedDB : `users`, `studentProfiles`, `counselorProfiles`, `institutions`, `formations`, `favorites`, `comparisons`, `shares`, `appointmentRequests`, `appointments`, `messages`, `counselorNotes`, `deadlines`, `reminders`, `sessions`, `activityLog`, `meta`.

Identifiants stables, relations par identifiant (jamais par nom affiché), dates ISO 8601, index et contraintes d’unicité (`&email`, `&[userId+formationId]`, `&[studentId+audience]`, `&[counselorId+studentId]`). L’e-mail normalisé sert à l’authentification, jamais de clé relationnelle.

## Seed et réinitialisation

- `src/db/seed/*.ts` : déterministe, versionné (`SEED_VERSION`), chargé au premier lancement.
- À la réouverture, rien n’est écrasé ; si `SEED_VERSION` augmente, seuls les enregistrements manquants sont ajoutés (migration non destructive).
- Menu du compte → **Réinitialiser les données de démo** (avec confirmation) : les comptes, formations, établissements, échanges et journaux de démonstration reviennent à leur état initial ; les comptes créés dans le navigateur sont conservés avec leurs propres données.

## Authentification locale et sécurité

- Mots de passe hachés avec **PBKDF2-SHA-256 (Web Crypto), 600 000 itérations** (recommandation OWASP 2023), sel aléatoire de 16 octets par compte (`crypto.getRandomValues`), comparaison en temps constant. Algorithme, itérations, sel et résultat dérivé sont stockés avec le compte.
- Aucun mot de passe en clair dans IndexedDB, `localStorage`, `sessionStorage`, les journaux ou le seed : les comptes de démonstration utilisent le même mécanisme, avec des empreintes générées par `scripts/hash-password.mjs`.
- Session : seul l’identifiant de session est stocké, dans `localStorage` si « Rester connecté » est coché, sinon dans `sessionStorage`. La déconnexion révoque la session, la journalise et conserve les données du compte.
- « Mot de passe oublié » : réponse neutre, identique que le compte existe ou non (aucun e-mail envoyé).
- Les notifications sont vidées à chaque changement de session.

## Choix éthiques et consentements

- Bandeau permanent : « Orient’Avenir propose des pistes à discuter, jamais une décision d’admission. Pour candidater, utilisez la plateforme officielle. Données fictives. »
- **Affinité** = 0,5 × intérêts + 0,3 × spécialités + 0,2 × préférences, sur 5, bornée, valeurs manquantes neutres, avec la part de chaque critère et une phrase d’explication. Elle est séparée des **critères d’examen** (déclarés par l’établissement, normalisés à 100 %) et des **repères des années passées** (avec avertissement : ni une promesse, ni un refus).
- **Piste d’ouverture** : formation hors des trois premières, dont le domaine principal n’est au cœur d’aucune d’elles, mais qui rejoint un intérêt au moins « Moyennement ».
- **Moyennes** : visibles uniquement par le lycéen propriétaire. Les repositories destinés au conseiller et à l’établissement utilisent des projections qui les excluent ; des tests le vérifient.
- **Partage avec un conseiller** et **visibilité auprès des établissements** : désactivés par défaut, explicites, datés, révocables, journalisés. Le retrait rend immédiatement le dossier ou le profil inaccessible.
- **Chiffres d’intérêt** : uniquement agrégés ; toute valeur inférieure à 10 est affichée « Moins de 10 » et ne quitte jamais le repository.
- Découverte : identique pour tous, jamais classée selon le profil.

## Déploiement GitHub Pages

Le workflow `.github/workflows/deploy-pages.yml` s’exécute sur `main` (et sur les pull requests, sans déploiement) : `npm ci` → lint → TypeScript → Vitest → Playwright → build → déploiement Pages **seulement si tout a réussi**.

La base Vite est `/Orient-Avenir/` ; `HashRouter` rend l’accès direct, le rafraîchissement et les liens profonds compatibles avec Pages ; les tests end-to-end tournent sur ce même build servi sous `/Orient-Avenir/`. Dans les réglages du dépôt, la source Pages doit être « GitHub Actions ».

## Limites du prototype

- Données et comptes propres à un navigateur : pas de synchronisation entre appareils, effacés si le stockage du site est vidé.
- Pas de serveur : pas d’e-mails, de notifications téléphone, de visio ni de candidature réels (simulés et signalés comme tels).
- La lecture du bulletin est simulée (le fichier n’est ni lu ni conservé).
- Le hachage local protège les mots de passe au repos, mais un prototype 100 % client ne remplace pas une authentification serveur.
- Écarts avec les maquettes : voir [`docs/ECARTS.md`](docs/ECARTS.md). Audit : [`docs/AUDIT.md`](docs/AUDIT.md). Validation : [`docs/VALIDATION.md`](docs/VALIDATION.md).
