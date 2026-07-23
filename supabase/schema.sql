-- KFM Suivi — schéma initial et policies RLS
-- À exécuter dans le SQL Editor de Supabase (ou via `supabase db push`).

-- 1. Table profiles ---------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('driver', 'boss')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Fonction security definer : évite la récursion infinie qu'on obtiendrait
-- en interrogeant `profiles` depuis une policy portant sur `profiles`.
create or replace function public.is_boss()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'boss'
  );
$$;

-- Chacun peut lire son propre profil ; le patron peut lire tous les profils
-- (nécessaire pour afficher le nom des chauffeurs dans le tableau comparatif).
create policy "profiles_select_own_or_boss"
  on public.profiles for select
  using (id = auth.uid() or public.is_boss());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- La policy ci-dessus autorise la mise à jour de la ligne, mais pas de
-- colonne en particulier : sans cette restriction, un chauffeur pourrait
-- s'auto-promouvoir "boss" via un appel API direct. Seule full_name reste
-- modifiable par le client ; le rôle se change uniquement via Table Editor
-- ou service role.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- 2. Table daily_entries -----------------------------------------------------
-- Reprend le rapport papier "KFM TRANSPORT" : un seul kilométrage pour la
-- journée, mais les tournées (poses) et courses sont saisies séparément pour
-- le matin et l'après-midi car certains chauffeurs font 2 sorties par jour.

create table if not exists public.daily_entries (
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

create index if not exists daily_entries_driver_date_idx
  on public.daily_entries (driver_id, entry_date desc);

-- Un chauffeur ne voit/écrit que ses propres lignes ; le patron voit tout.
create policy "daily_entries_select_own_or_boss"
  on public.daily_entries for select
  using (driver_id = auth.uid() or public.is_boss());

create policy "daily_entries_insert_own"
  on public.daily_entries for insert
  with check (driver_id = auth.uid());

-- Modification autorisée uniquement par le chauffeur propriétaire, dans les
-- 24h suivant la création (cf. prompt : "à discuter, sinon laisser
-- modifiable"). Retirer la condition sur created_at pour lever la limite.
-- WITH CHECK empêche un chauffeur de réassigner sa ligne à un autre
-- driver_id en la modifiant.
create policy "daily_entries_update_own_within_24h"
  on public.daily_entries for update
  using (
    driver_id = auth.uid()
    and created_at > now() - interval '24 hours'
  )
  with check (driver_id = auth.uid());

-- 3. Création automatique du profil à l'inscription --------------------------
-- Le rôle par défaut est 'driver' ; à changer manuellement en 'boss' dans la
-- table profiles pour les comptes patron.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'driver'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
