-- Migration à exécuter dans l'éditeur SQL de Neon (une commande à la fois si besoin)
-- Ajoute la notion de phase (poules / finale Pointe-Noire / grande finale) et un vainqueur explicite.

ALTER TABLE matches ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'groupes';

ALTER TABLE matches ADD COLUMN IF NOT EXISTS winner TEXT;
