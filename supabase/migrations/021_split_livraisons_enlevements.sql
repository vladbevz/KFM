-- Sépare la déclaration/tarification/objectif livraisons et enlèvements,
-- jusqu'ici combinés en un seul total (poses+enlèvements) partout : seuil
-- de rentabilité, prix Geodis, déclaration dispatch au démarrage.
--
-- Additif uniquement : aucune colonne existante n'est retirée, aucun
-- comportement actuel ne change tant que les nouveaux champs restent vides
-- (fallback vers l'ancien comportement à chaque niveau, cf. code applicatif).

-- 1. Objectif livraisons/enlèvements séparé (sectors, visible chauffeur —
--    même rôle que rentability_target, qui devient l'objectif livraisons).
alter table public.sectors add column if not exists target_livraisons integer;
alter table public.sectors add column if not exists target_enlevements integer;

update public.sectors
set target_livraisons = rentability_target
where payment_type = 'a_la_pose' and target_livraisons is null;

-- 2. Tarif enlèvements séparé (sector_prices, patron uniquement — même
--    isolation RLS que price_per_pose, qui devient le tarif livraisons).
alter table public.sector_prices add column if not exists price_per_enlevement numeric;

-- 3. Déclaration dispatch séparée au démarrage de tournée (remplace
--    dispatch_declared_total pour les nouvelles tournées ; conservé pour
--    l'historique déjà saisi).
alter table public.daily_entries add column if not exists dispatch_declared_livraisons integer;
alter table public.daily_entries add column if not exists dispatch_declared_enlevements integer;

-- 4. Prix enlèvement figé à la clôture de tournée, même principe que
--    price_per_pose/forfait_amount (jamais recalculé rétroactivement).
alter table public.daily_entry_price_snapshots add column if not exists price_per_enlevement numeric;
