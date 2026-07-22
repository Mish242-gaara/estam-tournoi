-- Migration à exécuter dans l'éditeur SQL de Neon (après les précédentes)
-- Enrichit le fil d'événements : buts, cartons, remplacements, infos (mi-temps, coup d'envoi...)

ALTER TABLE events ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'goal';
ALTER TABLE events ADD COLUMN IF NOT EXISTS player_out TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS detail TEXT;
ALTER TABLE events ALTER COLUMN team DROP NOT NULL;
