-- Remplace la structure simplifiée de daily_entries par la structure
-- correspondant au rapport papier "KFM TRANSPORT" (matin/après-midi).
-- Aucune donnée réelle n'existe encore dans cette table : on la recrée.
-- À exécuter dans le SQL Editor de Supabase.

drop table if exists public.daily_entries cascade;

create table public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null,

  vehicle_registration text not null,
  km_depart integer not null check (km_depart >= 0),
  km_arrivee integer not null check (km_arrivee >= km_depart),

  matin_tournee_numero text,
  matin_poses_livraison integer check (matin_poses_livraison >= 0),
  matin_poses_enlevement integer check (matin_poses_enlevement >= 0),
  matin_courses text,

  apres_midi_tournee_numero text,
  apres_midi_poses_livraison integer check (apres_midi_poses_livraison >= 0),
  apres_midi_poses_enlevement integer check (apres_midi_poses_enlevement >= 0),
  apres_midi_courses text,

  anomalie_tournee text,
  anomalie_vehicule text,

  created_at timestamptz not null default now(),
  unique (driver_id, entry_date)
);

alter table public.daily_entries enable row level security;

create index daily_entries_driver_date_idx
  on public.daily_entries (driver_id, entry_date desc);

create policy "daily_entries_select_own_or_boss"
  on public.daily_entries for select
  using (driver_id = auth.uid() or public.is_boss());

create policy "daily_entries_insert_own"
  on public.daily_entries for insert
  with check (driver_id = auth.uid());

create policy "daily_entries_update_own_within_24h"
  on public.daily_entries for update
  using (
    driver_id = auth.uid()
    and created_at > now() - interval '24 hours'
  );
