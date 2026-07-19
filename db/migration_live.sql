-- Migration à exécuter dans l'éditeur SQL de Neon (une seule fois)
-- Ajoute le suivi en direct : minute de jeu + fil d'événements (buts).

ALTER TABLE matches ADD COLUMN IF NOT EXISTS minute INTEGER;

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  minute INTEGER NOT NULL,
  team CHAR(1) NOT NULL, -- 'A' ou 'B'
  scorer TEXT,
  created_at TIMESTAMP DEFAULT now()
);
