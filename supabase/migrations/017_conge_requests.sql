-- Module B (congés) : demande de congé chauffeur → validation patron. Une
-- fois approuvée, alimente automatiquement la table schedule déjà existante
-- (type 'conge', source 'prevu') — même mécanisme que la création manuelle
-- côté patron (saveScheduleEntry), pas de nouvelle logique de calendrier.

create type public.conge_request_status as enum ('pending', 'approved', 'rejected');

create table if not exists public.conge_requests (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  status public.conge_request_status not null default 'pending',
  note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id)
);

alter table public.conge_requests enable row level security;

create index if not exists conge_requests_driver_idx on public.conge_requests (driver_id);
create index if not exists conge_requests_status_idx on public.conge_requests (status);

-- Un chauffeur voit et crée uniquement ses propres demandes ; le patron voit
-- et traite (approuve/refuse) toutes les demandes.
create policy "conge_requests_select_own_or_boss"
  on public.conge_requests for select
  using (driver_id = (select auth.uid()) or public.is_boss());

create policy "conge_requests_insert_own"
  on public.conge_requests for insert
  with check (driver_id = (select auth.uid()));

create policy "conge_requests_update_boss"
  on public.conge_requests for update
  using (public.is_boss())
  with check (public.is_boss());

-- Vue calendrier chauffeur anonymisée : un chauffeur ne peut normalement pas
-- lire les lignes schedule d'un autre chauffeur (RLS driver_id = auth.uid()
-- or is_boss()) — cette fonction security definer contourne volontairement
-- cette restriction mais ne renvoie QUE des dates (jamais driver_id, note,
-- ni aucune autre colonne), pour ne jamais exposer l'identité par ce chemin.
create or replace function public.conge_dates_other_drivers(from_date date, to_date date)
returns table (conge_date date)
language sql
security definer
set search_path = public
stable
as $$
  select date as conge_date
  from public.schedule
  where type = 'conge'
    and date between from_date and to_date
    and driver_id <> auth.uid()
  order by date;
$$;

grant execute on function public.conge_dates_other_drivers(date, date) to authenticated;
