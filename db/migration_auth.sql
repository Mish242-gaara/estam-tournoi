-- Migration à exécuter dans l'éditeur SQL de Neon (après les précédentes)
-- Ajoute les comptes utilisateurs avec rôles : admin / coach / fan.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'fan', -- admin | coach | fan
  status TEXT NOT NULL DEFAULT 'approved', -- approved | pending | rejected (les coachs démarrent en pending)
  team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL, -- filière encadrée, pour les coachs
  created_at TIMESTAMP DEFAULT now()
);
