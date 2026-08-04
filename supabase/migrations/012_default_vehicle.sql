-- Mémorisation de l'immatriculation par défaut, même mécanisme que
-- default_sector_id : préremplie au démarrage de tournée, mise à jour si le
-- chauffeur change de véhicule.
alter table profiles add column if not exists default_vehicle_id uuid references vehicles (id);
grant update (full_name, default_sector_id, default_vehicle_id) on public.profiles to authenticated;
