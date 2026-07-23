-- Migration à exécuter dans l'éditeur SQL de Neon (après les précédentes)
-- Autorise les matchs sans date/heure fixée (ex. demi-finales créées avant d'être programmées).

ALTER TABLE matches ALTER COLUMN date DROP NOT NULL;
ALTER TABLE matches ALTER COLUMN time DROP NOT NULL;
