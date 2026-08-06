-- Retrait d'un véhicule de la flotte sans perdre son historique (réparations,
-- pannes, pleins, documents) — même principe que profiles.active pour les
-- chauffeurs. La suppression définitive reste possible séparément côté
-- application (deleteVehicleForever), réservée aux véhicules sans historique.
alter table vehicles add column if not exists retired boolean not null default false;
create index if not exists vehicles_retired_idx on vehicles (retired);
