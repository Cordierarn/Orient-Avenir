# Orient'Avenir

Orient'Avenir est un prototype web interactif d'aide à l'orientation post-bac (projet étudiant de Design des usages). L'application propose des **pistes explicables** pour un lycéen, avec des espaces dédiés conseiller et établissement.

> ⚠️ Tout est fictif, côté navigateur uniquement : aucune vraie authentification, aucun serveur, aucune décision d'admission.

## Stack

- React 18 + Vite + TypeScript
- React Router en `HashRouter` (compatible GitHub Pages)
- Icônes : `lucide-react`
- Tests : Vitest (logique de scoring)

## Lancement local

```bash
npm install
npm run dev
```

Build de production :

```bash
npm run build
```

Tests :

```bash
npm run test
```

## Parcours de démo

1. Accueil → **Commencer le questionnaire**
2. Profil : intérêts → préférences → dossier facultatif
3. **Pistes** : comprendre "Pourquoi cette piste ?" et la piste d'ouverture
4. Sélectionner 2 à 3 formations puis aller à **Comparer**
5. Ajouter une formation en **Favoris**, écrire une note et gérer les consentements
6. Simuler un **Rendez-vous** puis consulter **Échange** et **Échéances**
7. Basculer le rôle vers **Conseiller** puis **Établissement**

## Choix éthiques intégrés

- Bandeau permanent : la plateforme propose des pistes, jamais une décision.
- Score d'affinité présenté en repère d'exploration, **pas** en chance d'admission.
- Bloc explicatif avec pondération : intérêts 50 %, spécialités 30 %, préférences 20 %.
- Repères historiques séparés, avec mention explicite : estimation fictive, sans promesse.
- Une piste d'ouverture est toujours ajoutée pour limiter l'effet bulle.
- Les moyennes restent locales et facultatives.
- Partage conseiller / visibilité écoles seulement avec consentement explicite et révocable.
- Côté établissement : données agrégées, valeurs < 10 masquées, pas d'export.

## Limites du prototype

- Données 100 % fictives.
- Aucun backend : pas de comptes, pas d'envoi réel de messages, pas de notifications réelles.
- Pas de synchronisation multi-appareils.

## Déploiement GitHub Pages

Un workflow GitHub Actions (`.github/workflows/deploy-pages.yml`) build et déploie automatiquement sur GitHub Pages à chaque push sur `main`.
