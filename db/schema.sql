-- ESTAM Tournoi Inter-Filières — schéma de base de données (Postgres / Neon)

CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  time TIME NOT NULL,
  team_a TEXT NOT NULL,
  team_b TEXT NOT NULL,
  score_a INTEGER,
  score_b INTEGER,
  group_name TEXT NOT NULL DEFAULT 'A',
  status TEXT NOT NULL DEFAULT 'upcoming', -- upcoming | live | done
  minute INTEGER,
  phase TEXT NOT NULL DEFAULT 'groupes', -- groupes | demi | quarts | huitiemes | finale_pn | finale_generale
  winner TEXT, -- nom de l'équipe gagnante (utile pour les matchs à élimination, en cas d'égalité/tirs au but)
  slot INTEGER -- ordre du match au sein de son tour (demi 1, demi 2, ...)
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  minute INTEGER NOT NULL,
  team CHAR(1), -- 'A' ou 'B', NULL pour les évènements non liés à une équipe (mi-temps, etc.)
  type TEXT NOT NULL DEFAULT 'goal', -- goal | yellow | red | substitution | info
  scorer TEXT, -- buteur, joueur qui prend le carton, ou joueur entrant (remplacement)
  player_out TEXT, -- joueur sortant (remplacement uniquement)
  detail TEXT, -- texte libre pour les évènements de type "info" (ex. "Mi-temps")
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  group_name TEXT NOT NULL DEFAULT 'A',
  played INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS scorers (
  id SERIAL PRIMARY KEY,
  player TEXT NOT NULL,
  filiere TEXT NOT NULL,
  goals INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'fan', -- admin | coach | fan
  status TEXT NOT NULL DEFAULT 'approved', -- approved | pending | rejected
  team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now()
);
