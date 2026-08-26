-- Revenu forfait (extension du prompt v38/v39, Module A) : montant fixe payé
-- par Geodis par tournée forfait effectuée, indépendant du volume réalisé.
-- Même raisonnement d'isolation que price_per_pose (v38) : table dédiée,
-- réservée au patron par RLS is_boss() — jamais une colonne sur sectors,
-- pour qu'un chauffeur ne puisse jamais la lire même via un futur
-- select("*") côté chauffeur.
create table if not exists public.sector_forfait_amounts (
  sector_id uuid primary key references public.sectors (id) on delete cascade,
  forfait_amount numeric,
  updated_at timestamptz not null default now()
);

alter table public.sector_forfait_amounts enable row level security;

create policy "sector_forfait_amounts_boss_only"
  on public.sector_forfait_amounts for all
  using (public.is_boss())
  with check (public.is_boss());

-- Le snapshot figé par tournée (daily_entry_price_snapshots, v38) doit
-- maintenant pouvoir porter soit un prix par pose (à la pose), soit un
-- montant forfait (forfait) — jamais les deux sur la même ligne. Un
-- changement de forfait_amount ne doit pas plus recalculer rétroactivement
-- une tournée forfait déjà close qu'un changement de price_per_pose ne le
-- fait pour une tournée à la pose (même garantie, cf. v38).
alter table public.daily_entry_price_snapshots alter column price_per_pose drop not null;
alter table public.daily_entry_price_snapshots add column if not exists forfait_amount numeric;
alter table public.daily_entry_price_snapshots add constraint daily_entry_price_snapshots_one_value
  check (
    (price_per_pose is not null and forfait_amount is null)
    or (price_per_pose is null and forfait_amount is not null)
  );
