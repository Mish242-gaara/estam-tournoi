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

## 4. Utilisation au quotidien

- N'importe quel visiteur voit le programme, les classements et les buteurs en lecture seule.
- Un organisateur clique sur **"Mode organisateur"**, entre le code (`ADMIN_PIN`), et peut :
  - Ajouter / modifier / supprimer des matchs (date, heure, équipes, score, statut, groupe).
  - Ajouter / modifier / supprimer des lignes de classement (J, BM, BE, Pts).
  - Ajouter / modifier / supprimer des buteurs.
- Toutes les modifications sont enregistrées immédiatement dans la base et visibles par tous.

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
