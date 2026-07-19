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
  status TEXT NOT NULL DEFAULT 'upcoming' -- upcoming | live | done
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
