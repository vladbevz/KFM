-- Distingue les affectations planifiées à l'avance par le patron ('prevu',
-- calendrier ou planificateur hebdomadaire) de celles reflétant une tournée
-- réellement démarrée par le chauffeur ('reel', déjà en place). Une entrée
-- 'prevu' passe à 'reel' quand le chauffeur démarre sa tournée (startTournee)
-- ; planned_sector_id garde la trace de ce qui était prévu à ce moment-là,
-- pour détecter un écart (tournée réelle différente de la tournée prévue) et
-- afficher une icône d'alerte discrète sans bloquer ni dupliquer la ligne
-- (contrainte unique (driver_id, date) déjà en place).
alter table schedule add column if not exists source text not null default 'reel' check (source in ('prevu', 'reel'));
alter table schedule add column if not exists planned_sector_id uuid references sectors (id);
