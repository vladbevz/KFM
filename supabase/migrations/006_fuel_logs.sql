-- Module Carburant : suivi des pleins par chauffeur.
-- À exécuter dans le SQL Editor de Supabase.

create table public.fuel_logs (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id),
  liters numeric not null check (liters > 0),
  odometer integer not null check (odometer >= 0),
  filled_at date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.fuel_logs enable row level security;

create index fuel_logs_driver_filled_idx
  on public.fuel_logs (driver_id, filled_at desc);

-- Un chauffeur ajoute et consulte ses propres pleins ; le patron consulte
-- tout (vue par véhicule/chauffeur). Ni update ni delete demandés — juste
-- ajout + historique brut.
create policy "fuel_logs_select_own_or_boss"
  on public.fuel_logs for select
  using (driver_id = (select auth.uid()) or public.is_boss());

create policy "fuel_logs_insert_own"
  on public.fuel_logs for insert
  with check (driver_id = (select auth.uid()));
