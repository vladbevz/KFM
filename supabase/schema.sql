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
  using (id = (select auth.uid()) or public.is_boss());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = (select auth.uid()));

create index if not exists profiles_role_idx on public.profiles (role);

-- La policy ci-dessus autorise la mise à jour de la ligne, mais pas de
-- colonne en particulier : sans cette restriction, un chauffeur pourrait
-- s'auto-promouvoir "boss" via un appel API direct. Seule full_name reste
-- modifiable par le client ; le rôle se change uniquement via Table Editor
-- ou service role.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- 2. Table sectors (secteurs / rentabilité) -----------------------------------
-- Chaque secteur a un modèle de rémunération propre, avec des seuils de
-- poses selon le modèle. Créée avant daily_entries car référencée par FK.

create type public.payment_model as enum (
  'qty_am_qty_pm',
  'qty_am_forfait_pm',
  'forfait_day',
  'qty_day'
);

create table if not exists public.sectors (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  payment_type public.payment_model not null,
  morning_threshold integer,
  afternoon_threshold integer,
  day_threshold integer,
  created_at timestamptz not null default now()
);

alter table public.sectors enable row level security;

create policy "sectors_select_authenticated"
  on public.sectors for select to authenticated using (true);

create policy "sectors_boss_insert"
  on public.sectors for insert with check (public.is_boss());

create policy "sectors_boss_update"
  on public.sectors for update using (public.is_boss()) with check (public.is_boss());

create policy "sectors_boss_delete"
  on public.sectors for delete using (public.is_boss());

-- 3. Table daily_entries -----------------------------------------------------
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
  matin_sector_id uuid references public.sectors (id),

  apres_midi_tournee_numero text,
  apres_midi_poses_livraison integer check (apres_midi_poses_livraison >= 0),
  apres_midi_poses_enlevement integer check (apres_midi_poses_enlevement >= 0),
  apres_midi_courses text,
  apres_midi_sector_id uuid references public.sectors (id),

  anomalie_tournee text,
  anomalie_vehicule text,

  created_at timestamptz not null default now(),
  unique (driver_id, entry_date)
);

alter table public.daily_entries enable row level security;

create index if not exists daily_entries_driver_date_idx
  on public.daily_entries (driver_id, entry_date desc);

create index if not exists daily_entries_matin_sector_idx
  on public.daily_entries (matin_sector_id);
create index if not exists daily_entries_apres_midi_sector_idx
  on public.daily_entries (apres_midi_sector_id);

-- Un chauffeur ne voit/écrit que ses propres lignes ; le patron voit tout.
create policy "daily_entries_select_own_or_boss"
  on public.daily_entries for select
  using (driver_id = (select auth.uid()) or public.is_boss());

create policy "daily_entries_insert_own"
  on public.daily_entries for insert
  with check (driver_id = (select auth.uid()));

-- Modification autorisée uniquement par le chauffeur propriétaire, dans les
-- 24h suivant la création (cf. prompt : "à discuter, sinon laisser
-- modifiable"). Retirer la condition sur created_at pour lever la limite.
-- WITH CHECK empêche un chauffeur de réassigner sa ligne à un autre
-- driver_id en la modifiant.
create policy "daily_entries_update_own_within_24h"
  on public.daily_entries for update
  using (
    driver_id = (select auth.uid())
    and created_at > now() - interval '24 hours'
  )
  with check (driver_id = (select auth.uid()));

-- 4. Véhicules et signalements de panne --------------------------------------

create type public.vehicle_status as enum (
  'operational',
  'issue_running',
  'unavailable',
  'in_repair'
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  plate text not null,
  label text,
  status public.vehicle_status not null default 'operational',
  created_at timestamptz not null default now()
);

alter table public.vehicles enable row level security;

create policy "vehicles_select_authenticated"
  on public.vehicles for select to authenticated using (true);

create policy "vehicles_boss_insert"
  on public.vehicles for insert with check (public.is_boss());

create policy "vehicles_boss_update"
  on public.vehicles for update using (public.is_boss()) with check (public.is_boss());

create policy "vehicles_boss_delete"
  on public.vehicles for delete using (public.is_boss());

create table if not exists public.vehicle_issues (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  reported_by uuid references public.profiles (id) on delete set null,
  description text,
  photo_url text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  reported_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.vehicle_issues enable row level security;

create index if not exists vehicle_issues_vehicle_status_idx
  on public.vehicle_issues (vehicle_id, status);

create policy "vehicle_issues_select_own_or_boss"
  on public.vehicle_issues for select
  using (reported_by = (select auth.uid()) or public.is_boss());

create policy "vehicle_issues_insert_own_or_boss"
  on public.vehicle_issues for insert
  with check (reported_by = (select auth.uid()) or public.is_boss());

create policy "vehicle_issues_update_boss"
  on public.vehicle_issues for update
  using (public.is_boss()) with check (public.is_boss());

-- Un chauffeur ne doit pouvoir faire passer un véhicule qu'en
-- "issue_running" ou "unavailable" — jamais "operational"/"in_repair"
-- (réservé au patron). Une policy RLS classique ne peut pas garantir ça de
-- façon sûre sur une seule requête UPDATE (rien n'empêcherait de glisser un
-- changement de plate/label dans la même requête). On passe donc par une
-- fonction security definer avec des paramètres typés et validés.
create or replace function public.report_vehicle_issue(
  p_vehicle_id uuid,
  p_new_status public.vehicle_status,
  p_description text,
  p_photo_url text default null
) returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_new_status not in ('issue_running', 'unavailable') then
    raise exception 'invalid status for driver report: %', p_new_status;
  end if;

  insert into public.vehicle_issues (vehicle_id, reported_by, description, photo_url)
  values (p_vehicle_id, auth.uid(), p_description, p_photo_url);

  update public.vehicles set status = p_new_status where id = p_vehicle_id;
end;
$$;

revoke all on function public.report_vehicle_issue(uuid, public.vehicle_status, text, text) from public;
grant execute on function public.report_vehicle_issue(uuid, public.vehicle_status, text, text) to authenticated;

-- Bucket Storage privé pour les photos de panne. Chemin attendu :
-- {driver_id}/{filename} — les policies s'appuient dessus.
insert into storage.buckets (id, name, public)
values ('vehicle-issues', 'vehicle-issues', false)
on conflict (id) do nothing;

create policy "vehicle_issues_photos_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'vehicle-issues'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "vehicle_issues_photos_select_own_or_boss"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'vehicle-issues'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.is_boss()
    )
  );

-- 5. Calendrier ----------------------------------------------------------------

create type public.assignment_type as enum ('tournee', 'conge', 'absence');

create table if not exists public.schedule (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  type public.assignment_type not null,
  sector_id uuid references public.sectors (id),
  note text,
  created_at timestamptz not null default now(),
  unique (driver_id, date)
);

alter table public.schedule enable row level security;

-- L'index requis (driver_id, date) est déjà couvert par la contrainte unique
-- ci-dessus.

create policy "schedule_select_own_or_boss"
  on public.schedule for select
  using (driver_id = (select auth.uid()) or public.is_boss());

-- Lecture seule pour le chauffeur : seul le patron écrit le planning.
create policy "schedule_boss_insert"
  on public.schedule for insert with check (public.is_boss());

create policy "schedule_boss_update"
  on public.schedule for update using (public.is_boss()) with check (public.is_boss());

create policy "schedule_boss_delete"
  on public.schedule for delete using (public.is_boss());

-- 6. Carburant -----------------------------------------------------------------

create table if not exists public.fuel_logs (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id),
  liters numeric not null check (liters > 0),
  odometer integer not null check (odometer >= 0),
  filled_at date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.fuel_logs enable row level security;

create index if not exists fuel_logs_driver_filled_idx
  on public.fuel_logs (driver_id, filled_at desc);

create policy "fuel_logs_select_own_or_boss"
  on public.fuel_logs for select
  using (driver_id = (select auth.uid()) or public.is_boss());

create policy "fuel_logs_insert_own"
  on public.fuel_logs for insert
  with check (driver_id = (select auth.uid()));

-- 7. Documents véhicules --------------------------------------------------------

create table if not exists public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  doc_name text not null,
  file_url text not null,
  expiry_date date,
  uploaded_at timestamptz not null default now()
);

alter table public.vehicle_documents enable row level security;

create index if not exists vehicle_documents_vehicle_expiry_idx
  on public.vehicle_documents (vehicle_id, expiry_date);

create policy "vehicle_documents_boss_select"
  on public.vehicle_documents for select using (public.is_boss());

create policy "vehicle_documents_boss_insert"
  on public.vehicle_documents for insert with check (public.is_boss());

create policy "vehicle_documents_boss_update"
  on public.vehicle_documents for update using (public.is_boss()) with check (public.is_boss());

create policy "vehicle_documents_boss_delete"
  on public.vehicle_documents for delete using (public.is_boss());

insert into storage.buckets (id, name, public)
values ('vehicle-documents', 'vehicle-documents', false)
on conflict (id) do nothing;

create policy "vehicle_documents_files_boss_all"
  on storage.objects for all to authenticated
  using (bucket_id = 'vehicle-documents' and public.is_boss())
  with check (bucket_id = 'vehicle-documents' and public.is_boss());

-- 8. Documents chauffeurs --------------------------------------------------------

create table if not exists public.driver_documents (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  doc_name text not null,
  file_url text,
  expiry_date date,
  uploaded_at timestamptz not null default now()
);

alter table public.driver_documents enable row level security;

create index if not exists driver_documents_driver_expiry_idx
  on public.driver_documents (driver_id, expiry_date);

create policy "driver_documents_select_own_or_boss"
  on public.driver_documents for select
  using (driver_id = (select auth.uid()) or public.is_boss());

create policy "driver_documents_boss_insert"
  on public.driver_documents for insert with check (public.is_boss());

create policy "driver_documents_boss_update"
  on public.driver_documents for update using (public.is_boss()) with check (public.is_boss());

create policy "driver_documents_boss_delete"
  on public.driver_documents for delete using (public.is_boss());

insert into storage.buckets (id, name, public)
values ('driver-documents', 'driver-documents', false)
on conflict (id) do nothing;

create policy "driver_documents_files_select_own_or_boss"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'driver-documents'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.is_boss()
    )
  );

create policy "driver_documents_files_boss_write"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'driver-documents' and public.is_boss());

create policy "driver_documents_files_boss_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'driver-documents' and public.is_boss())
  with check (bucket_id = 'driver-documents' and public.is_boss());

-- 9. Création automatique du profil à l'inscription --------------------------
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
