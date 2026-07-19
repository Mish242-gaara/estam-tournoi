-- Données de départ, reprises des affiches du tournoi (à exécuter une seule fois)

INSERT INTO matches (date, time, team_a, team_b, score_a, score_b, group_name, status) VALUES
  ('2026-07-18', '12:30', 'GE/ETA', 'MTL', NULL, NULL, 'B', 'upcoming'),
  ('2026-07-18', '14:30', 'IIM', 'GI', NULL, NULL, 'A', 'upcoming');

INSERT INTO teams (name, group_name, played, goals_for, goals_against, points) VALUES
  ('CBF/GRH', 'A', 1, 4, 4, 1),
  ('GI', 'A', 1, 4, 4, 1),
  ('IIM', 'A', 0, 0, 0, 0),
  ('MTL', 'B', 1, 6, 0, 3),
  ('GE/ETA', 'B', 0, 0, 0, 0),
  ('QHSE', 'B', 1, 0, 6, 0);

INSERT INTO scorers (player, filiere, goals) VALUES
  ('Ndakebonga Divin', 'GI', 2),
  ('Joseph', 'CBF/GRH', 2),
  ('Andrea', 'MTL', 2),
  ('Jacque', 'GI', 1),
  ('Lopez', 'CBF/GRH', 1),
  ('Rody', 'CBF/GRH', 1),
  ('Kirelo Dieuveil', 'MTL', 1),
  ('Penge Jemael', 'MTL', 1),
  ('Tsaty La D', 'MTL', 1),
  ('Zinga Claude', 'MTL', 1);
