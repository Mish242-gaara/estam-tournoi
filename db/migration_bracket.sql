-- Migration à exécuter dans l'éditeur SQL de Neon (après migration_playoffs.sql)
-- Ajoute l'ordre des matchs au sein d'un tour à élimination (demi 1, demi 2, etc.)

ALTER TABLE matches ADD COLUMN IF NOT EXISTS slot INTEGER;
