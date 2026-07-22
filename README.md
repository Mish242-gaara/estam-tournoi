# ESTAM — Site du Tournoi Inter-Filières

Site Next.js avec CRUD complet (matchs, classements, buteurs), connecté à une base
Postgres gratuite **Neon**, prêt à déployer sur **Vercel**.

## 1. Créer la base de données (Neon, gratuit)

1. Allez sur https://neon.tech et créez un compte gratuit.
2. Créez un projet (ex. "estam-tournoi").
3. Copiez la **connection string** fournie (commence par `postgresql://...?sslmode=require`).

> Alternative encore plus simple : dans votre projet Vercel, onglet **Storage** →
> **Create Database** → **Neon (Postgres)**. Vercel crée la base et remplit
> automatiquement la variable `DATABASE_URL`, vous n'avez rien à copier.

## 2. Créer les tables et les données de départ

En local, avant de déployer :

```bash
npm install
DATABASE_URL="votre_connection_string" npm run seed
```

Cela crée les 3 tables (`matches`, `teams`, `scorers`) et insère le programme,
les classements et les buteurs actuels du tournoi.

(Alternative : collez le contenu de `db/schema.sql` puis `db/seed.sql` dans
l'éditeur SQL de Neon, sans passer par le script Node.)

## 3. Déployer sur Vercel

1. Poussez ce dossier sur un dépôt GitHub.
2. Sur https://vercel.com, **Import Project** → sélectionnez le dépôt.
3. Dans **Environment Variables**, ajoutez :
   - `DATABASE_URL` — votre connection string Neon (déjà rempli si vous êtes passé par l'intégration Vercel).
   - `ADMIN_PIN` — le code que les organisateurs utiliseront pour activer le mode édition (ex. `ESTAM2026`, changez-le).
4. Déployez. Le site est en ligne, tout le monde voit les mêmes données.

## 4. Créer le premier compte administrateur

Le code `ADMIN_PIN` ne sert plus qu'à amorcer le tout premier compte admin (il n'y a plus de "mode organisateur" partagé par code — chacun a désormais son propre compte).

1. Ouvrez `https://votre-site.vercel.app/bootstrap-admin`
2. Entrez le code `ADMIN_PIN`, un nom, un email et un mot de passe
3. Vous pouvez maintenant vous connecter normalement depuis la page d'accueil avec cet email/mot de passe

Cette page reste accessible ensuite (elle sert aussi si vous voulez créer un deuxième compte admin), mais n'est jamais liée dans la navigation.

## 5. Comptes et rôles

- **Supporter (fan)** : inscription libre, activée immédiatement.
- **Coach** : inscription libre, mais le compte reste **en attente** tant qu'un administrateur ne l'a pas validé depuis l'onglet **"Comptes"** (visible seulement pour les admins). Un coach choisit sa filière à l'inscription.
- **Administrateur** : créé uniquement via `/bootstrap-admin`. Peut tout modifier (matchs, scores, classements, buteurs, phases finales) et valider/refuser les comptes coachs.

## 6. Utilisation au quotidien

- N'importe quel visiteur voit le programme, les classements, les phases finales et les buteurs en lecture seule, sans compte.
- Un administrateur connecté peut :
  - Ajouter / modifier / supprimer des matchs (date, heure, équipes, score, statut, groupe).
  - Passer un match en **"En direct"**, ajuster la minute de jeu, ajouter des buts un par un (le score se met à jour tout seul).
  - Ajouter / modifier / supprimer des lignes de classement (J, BM, BE, Pts) et des buteurs.
  - Depuis l'onglet **Finales**, créer automatiquement le bon tour à élimination (demi-finales, quarts, etc.) en fonction du nombre de groupes, puis la grande finale contre Brazzaville.
  - Depuis l'onglet **Comptes**, valider ou refuser les inscriptions de coachs.
- Toutes les modifications sont enregistrées immédiatement dans la base et visibles par tous, avec rafraîchissement automatique côté visiteurs toutes les 12 secondes.
- Les comptes coach n'ont pas encore de fonctionnalités dédiées (gestion d'effectif, compositions) — c'est la prochaine étape prévue.

### Phases finales — comment ça marche

- **2 équipes se qualifient par groupe** (1ère et 2e place du classement).
- Le site calcule automatiquement le nombre total de qualifiés (2 × nombre de groupes) et en déduit le bon tour de départ :
  - 2 groupes (4 qualifiés) → Demi-finales → Finale Pointe-Noire
  - 4 groupes (8 qualifiés) → Quarts de finale → Demi-finales → Finale Pointe-Noire
  - 8 groupes (16 qualifiés) → Huitièmes → Quarts → Demi-finales → Finale Pointe-Noire
- Le tirage du premier tour croise les groupes (1er d'un groupe contre 2e d'un autre) pour éviter que deux équipes du même groupe ne se rencontrent tout de suite.
- Chaque tour ne peut être créé qu'une fois le tour précédent entièrement joué et son vainqueur désigné (sélecteur "Vainqueur" sur chaque match à élimination, utile en cas d'égalité + tirs au but).
- Une fois la Finale Pointe-Noire jouée, créez la Grande Finale : le nom de l'adversaire de Brazzaville se saisit manuellement (ce site ne suit pas leur bracket).

## Si vous ne voyez aucun changement après un déploiement

1. Vérifiez sur GitHub (dans le navigateur, pas juste en local) que le fichier `app/page.js` contient bien le mot `roundPlan` — sinon les nouveaux fichiers n'ont pas été poussés.
2. Dans Vercel, onglet **Deployments**, vérifiez que le dernier déploiement correspond bien au dernier commit (même heure) et que le statut est "Ready".
3. Faites un rechargement forcé du navigateur (Ctrl+Maj+R / Cmd+Maj+R) pour vider le cache.
4. Vérifiez que **toutes les migrations SQL** (`db/migration_live.sql`, `db/migration_playoffs.sql`, `db/migration_bracket.sql`, `db/migration_auth.sql`) ont bien été exécutées, dans cet ordre, sur la même base que celle utilisée par le site déployé.
5. Vérifiez que `JWT_SECRET` est bien défini dans les variables d'environnement Vercel (sinon les connexions ne persisteront pas correctement après redéploiement).

## Développement local

```bash
npm install
cp .env.example .env.local   # puis renseignez DATABASE_URL et ADMIN_PIN
npm run dev
```

## Sécurité du code organisateur

Le `ADMIN_PIN` est vérifié côté serveur sur chaque écriture (POST/PUT/DELETE),
mais reste un simple code partagé, pas un compte individuel. C'est suffisant
pour un usage interne au comité d'organisation. Si vous voulez des comptes
nominatifs plus tard, on peut ajouter une authentification par utilisateur.

## 7. Page dédiée par match (façon Sofascore/Flashscore)

Chaque match a sa propre page à l'adresse `/match/{id}` (accessible depuis le bouton "Détails →" / "🔴 Direct" sur chaque carte de match). Elle affiche :

- Un grand tableau de score avec minute en direct et statut
- Un **fil d'événements** en deux colonnes (équipe A à gauche, équipe B à droite), avec plusieurs types : ⚽ but, 🟨 carton jaune, 🟥 carton rouge, 🔁 remplacement, ℹ️ info libre (mi-temps, coup d'envoi, fin de match…)
- Un rafraîchissement automatique toutes les 5 secondes (plus rapide que la page d'accueil, puisque focalisée sur un seul match)
- Pour les administrateurs connectés : changement de statut, ajustement de la minute, correction manuelle du score, désignation du vainqueur (matchs à élimination), et un formulaire pour ajouter n'importe quel type d'événement

Seuls les événements de type **but** modifient le score automatiquement ; les cartons, remplacements et infos sont purement informatifs.

## Migrations SQL — récapitulatif complet dans l'ordre

1. `db/migration_live.sql`
2. `db/migration_playoffs.sql`
3. `db/migration_bracket.sql`
4. `db/migration_auth.sql`
5. `db/migration_events_enrich.sql`
