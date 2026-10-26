# Écarts volontaires avec les maquettes

Chaque écart est volontaire et motivé par une règle du cahier des charges (sécurité, confidentialité, logique métier, accessibilité) ou par une incohérence des captures. Les captures de l'implémentation sont dans `docs/captures/`, avec le même nom que la maquette de référence (`docs/maquette/`).

## Transversal

| Écran | Élément | Différence | Raison | Impact utilisateur | Action future |
| --- | --- | --- | --- | --- | --- |
| Tous | Couleur accent | `#2543D8` (cahier des charges) au lieu du bleu plus terne rendu dans l'export JPG | L'export des maquettes décale les couleurs ; le design system fait foi | Contraste renforcé | — |
| Tous | Logo | SVG redessiné d'après l'image fournie (`public/logo.svg`) | Aucun fichier vectoriel fourni | Aucun | Remplacer par le fichier source du logo s'il existe |
| Pages connectées | Menu du compte | Avatar + nom à droite du sélecteur de rôle (absent des maquettes) | Exigé : historique, changer de compte, réinitialiser, se déconnecter | Une commande de plus dans l'en-tête | — |
| Pages connectées | Sélecteur « Je suis » | Choisir un autre rôle ouvre « Changer d'espace » | Un compte ne peut accéder qu'aux routes de son rôle | Pas de bascule instantanée sans compte | — |
| Tous | Dates des maquettes | Les maquettes associent « Lun. 21 oct. », « Jeu. 24 oct. » à 2026, alors que le 21/10/2026 est un mercredi | Les dates affichées sont calculées (vraies dates) ; les créneaux du seed sont fixés en novembre 2026 | Jours de semaine corrects | — |
| Tous | Genre | Formulations neutres (« Inscrit·e », « ses attentes ») là où la maquette accorde au féminin | Les textes générés ne présument pas du genre d'un élève | Aucun | — |
| Nouvelles routes | `/mot-de-passe-oublie`, `/compte`, `/ecole/:id`, `/conseiller/profil`, `/etablissement/rattachement` | Pages sans maquette | Exigées (mot de passe oublié, historique, page publique, premiers parcours conseiller et établissement) | — | Maquetter ces écrans |

## Public

| Écran | Élément | Différence | Raison | Impact | Action future |
| --- | --- | --- | --- | --- | --- |
| 00 Connexion | Pastilles et encart éthique | Fond blanc translucide (`rgba(255,255,255,0.15)`), icônes blanches, texte présent | Défaut de l'export corrigé, demandé explicitement | — | — |
| 00 Connexion | « Vous êtes un professionnel ? » | Texte et liens sur deux zones distinctes, sans chevauchement ; liens vers l'inscription avec le rôle présélectionné | Défaut de l'export corrigé | — | — |
| 00 Connexion | Mention en pied | « Prototype : comptes stockés uniquement dans ce navigateur, aucun serveur. » au lieu de « aucune vraie authentification, cliquez sur Se connecter » | L'authentification locale est désormais réelle (PBKDF2) | Information exacte | — |
| 00 Connexion | Comptes de démonstration | Section ajoutée sous la carte | Exigée | — | — |
| 00 Connexion mobile | Bandeau | Le bandeau éthique reste dans le panneau bleu (mobile) | Cohérence avec le desktop | — | — |
| 99 404 | Pied de page | « Notez l'adresse de la page et signalez-la à l'équipe du projet » au lieu de « depuis le menu Aide » | Il n'existe pas de menu Aide | — | Ajouter une aide |
| 99 404 | Liens | Adaptés au rôle (« Voir mes demandes », « Voir mes fiches ») et à la session (renvoi vers la connexion) | Exigé | — | — |

## Lycéen

| Écran | Élément | Différence | Raison | Impact | Action future |
| --- | --- | --- | --- | --- | --- |
| 02 Accueil | Aperçu d'une piste | Affiche la première piste réelle du compte (« Votre première piste ») ; exemple de la maquette si le questionnaire est vide | Ne pas inventer une affinité | — | — |
| 02 Accueil | Bouton principal | « Reprendre le questionnaire » si des réponses existent | Reprise du questionnaire | — | — |
| 03 Intérêts | Aide | « Cliquez ou glissez sur une barre, ou utilisez les flèches du clavier » au lieu de « cliquez pour passer au niveau suivant » | Le curseur se règle par position, au clavier et au toucher (plus accessible) ; l'ancien texte serait faux | — | — |
| 03 Intérêts | « Enregistrer et reprendre plus tard » | Bouton ajouté ; domaine non renseigné affiché « À renseigner » | Exigence « reprendre plus tard » et gestion des valeurs manquantes | — | — |
| 06 Pistes | Points d'affinité et pourcentages | Calculés par la formule 0,5/0,3/0,2 : BUT Informatique 5 sur 5 (46/32/22 %) au lieu de 4 sur 5 (58/25/17 %) | Valeurs issues du calcul réel, non recopiées | Les trois pistes et la piste d'ouverture sont celles de la maquette | Ajuster les poids des formations avec l'équipe pédagogique |
| 06 Pistes | Autres pistes | Lien « Afficher les autres pistes (N) » sous la piste d'ouverture | Exigence « pistes calculées » au-delà des trois premières | — | — |
| 06/07 Pistes, fiche | Repère « profils proches » | Affiché seulement si le lycéen utilise ses moyennes (étape 3) | Les moyennes servent uniquement à ce repère | Sans dossier, une invitation remplace le chiffre | — |
| 07 Fiche | Critères d'examen | Poids affichés en libellé et en pourcentage (« Poids fort · 30 % ») | Critères normalisés à 100 % | — | — |
| 07 Fiche | Portes ouvertes | Bouton « Ajouter à mes échéances » fonctionnel | — | — | — |
| 08 Comparer | Lignes « Écart » | Calculées : durée, sélectivité, profils proches, alternance, part de pratique (≥ 25 points), coût | Règle explicite plutôt que lignes fixes | 2 lignes marquées en plus pour le jeu de la maquette | — |
| 08 Comparer | Dates de mise à jour | Licence Informatique 04/09/2026 et Cycle ingénieur 18/09/2026 (dates de Découverte) | Les maquettes 08 et 14 se contredisent | — | — |
| 09/11 Favoris | Panneau de droite | Trois états réels : partage (09), demande en attente, rendez-vous confirmé (11) | Reflète l'état stocké | — | — |
| 10 Rendez-vous | Mention de démo | « Connectez-vous ensuite en tant que conseiller pour répondre » au lieu de « la réponse du conseiller est simulée » | La réponse passe réellement par le compte conseiller | — | — |
| 10 Rendez-vous | Consentement | Case de partage ajoutée si le dossier n'est pas partagé | Une demande n'est visible d'un conseiller qu'avec consentement actif | — | — |
| 10 Rendez-vous | Créneaux | Semaine suivant la date du jour (réelle ou simulée) | Créneaux toujours à venir | — | — |
| 12 Échange | Visio | « Rejoindre la visio » désactivé jusqu'à 10 minutes avant ; aucun service de visio réel | Prototype sans serveur | — | Brancher un service de visio |
| 12 Échange | « Déplacer le rendez-vous » | Ouvre une fenêtre qui invite à proposer un créneau dans l'échange | Pas de replanification automatique | — | Replanification dédiée |
| 13 Échéances | Compteur et prochaine échéance | Compteur = échéances personnelles à venir ; « dans N jours » calculé avec la date du jour | Données réelles (la maquette suppose le 20/10/2026) | — | — |
| 13 Échéances | « Date du jour (démo) » | Carte ajoutée | Exigée pour simuler l'approche d'une échéance | — | — |
| 13 Échéances | « Ajouter à mon agenda » | Télécharge un fichier `.ics` local | Aucun envoi externe | — | — |
| 25 Accueil mobile | « Votre espace » | Mêmes cartes qu'en desktop (empilées) au lieu de lignes compactes avec chevron | Une seule implémentation responsive | Défilement un peu plus long | Variante compacte |
| 26 Pistes mobile | « Pourquoi cette piste ? » | Toujours déplié (la maquette le replie à partir de la 2e piste) | Simplicité, contenu explicatif toujours visible | Défilement plus long | Accordéon mobile |

## Découverte (commune)

| Élément | Différence | Raison | Impact | Action future |
| --- | --- | --- | --- | --- |
| Distance | Curseur à 200 km par défaut | La maquette affiche « Jusqu'à 50 km » tout en listant des formations à 52 et 74 km | — | — |
| Type de formation | Liste issue des données (dont CPGE et soins infirmiers) | 17 formations, 7 types | — | — |
| Mots-clés | 6 mots-clés les plus fréquents, puis « Plus de mots-clés » | Données réelles | — | — |
| Voir la fiche | Lycéen : fiche modale `/formation/:id` ; conseiller et établissement : fiche modale sans affinité | Les résultats ne dépendent jamais du profil | — | — |

## Conseiller

| Écran | Élément | Différence | Raison | Impact | Action future |
| --- | --- | --- | --- | --- | --- |
| 15 Demandes | Étiquette de correspondance | Calculée (« Correspond à vos domaines : concevoir et fabriquer » pour Yanis) | Correspondance réelle entre intérêts forts et domaines du conseiller | — | — |
| 16/17 Élève | Points à discuter et questions | Générés à partir des seules données partagées | Pas de texte inventé par élève | Formulations proches mais pas identiques | — |
| 17 Élève | Message après enregistrement | « La note reste visible par vous seul » au lieu de « Léa en est informée » | La note du conseiller est privée et séparée des données de l'élève | — | — |
| 16 Élève | Bouton principal | « Enregistrer et planifier l'entretien » seulement si un rendez-vous est planifié, sinon « Enregistrer la note » | Pas de planification sans créneau | — | — |
| 16 Élève | Échange | La messagerie s'ouvre dans le dossier (« Ouvrir l'échange ») | Pas de route dédiée au conseiller dans le cahier des charges | — | — |
| 16 Élève | Statuts de suivi | Statut choisi par le conseiller (« Changer le statut »), sinon déduit (demande, entretien) | Reproduit les statuts de la maquette | — | — |

## Établissement

| Écran | Élément | Différence | Raison | Impact | Action future |
| --- | --- | --- | --- | --- | --- |
| 19–21 Fiches | « Autres informations » | Section repliable (catégorie, durée, places, alternance, domaines, spécialités, mots-clés) | Indispensable pour que les nouvelles fiches alimentent les pistes et Découverte | — | — |
| 19–21 Fiches | Brouillon d'une fiche publiée | Confirmation demandée : la fiche quitte la vue des lycéens | Éviter une dépublication involontaire | — | — |
| 19–21 Fiches | Mise à jour invalide d'une fiche publiée | La version publiée reste en ligne ; la saisie reste dans le formulaire | Ne jamais montrer une fiche incomplète aux lycéens | — | — |
| 21 Chiffres | Calcul | Base historique fictive + favoris et comparaisons réels des comptes lycéens (hors invités) | Données agrégées réelles | Les chiffres évoluent avec l'usage | — |
| 22 Page école | « Ajouter aux favoris » | Retiré | Les favoris portent sur des formations, pas sur des écoles | — | — |
| 22 Page école | Valeurs, informations pratiques | Non ajoutées | Absentes des captures : rien n'est inventé | — | Contenus à fournir par l'établissement |
| 23 Profils | Total | « Moins de 10 lycéens… » sous le seuil ; les profils consentis restent affichés individuellement | Le seuil s'applique au chiffre agrégé ; chaque profil affiché a donné son accord | — | — |
