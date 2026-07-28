-- Modules Rentabilité, Véhicules, Calendrier.
-- À exécuter dans le SQL Editor de Supabase.

-- 1. Secteurs (rentabilité) --------------------------------------------------

create type public.payment_model as enum (
  'qty_am_qty_pm',
  'qty_am_forfait_pm',
  'forfait_day',
  'qty_day'
);

create table public.sectors (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  payment_type public.payment_model not null,
  morning_threshold integer,
  afternoon_threshold integer,
  day_threshold integer,
  created_at timestamptz not null default now()
);

alter table public.sectors enable row level security;

-- Tout utilisateur connecté doit pouvoir lister les secteurs (select dans le
-- formulaire de saisie chauffeur) ; seul le patron les crée/modifie.
create policy "sectors_select_authenticated"
  on public.sectors for select to authenticated using (true);

create policy "sectors_boss_insert"
  on public.sectors for insert with check (public.is_boss());

create policy "sectors_boss_update"
  on public.sectors for update using (public.is_boss()) with check (public.is_boss());

create policy "sectors_boss_delete"
  on public.sectors for delete using (public.is_boss());

-- Rattache chaque créneau de daily_entries à un secteur. Additif : les
-- lignes existantes (et les colonnes texte matin/apres_midi_tournee_numero)
-- ne sont pas touchées.
alter table public.daily_entries
  add column matin_sector_id uuid references public.sectors (id),
  add column apres_midi_sector_id uuid references public.sectors (id);

create index daily_entries_matin_sector_idx
  on public.daily_entries (matin_sector_id);
create index daily_entries_apres_midi_sector_idx
  on public.daily_entries (apres_midi_sector_id);

-- 2. Véhicules et signalements de panne --------------------------------------

create type public.vehicle_status as enum (
  'operational',
  'issue_running',
  'unavailable',
  'in_repair'
);

create table public.vehicles (
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

create table public.vehicle_issues (
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

create index vehicle_issues_vehicle_status_idx
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

-- 3. Calendrier ---------------------------------------------------------------

create type public.assignment_type as enum ('tournee', 'conge', 'absence');

create table public.schedule (
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
