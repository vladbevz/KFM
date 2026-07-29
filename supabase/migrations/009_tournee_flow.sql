-- Refonte du flux chauffeur : une ligne daily_entries = une tournée (pas
-- une journée). Cycle démarrer/terminer, plusieurs tournées/jour possibles.
-- À exécuter dans le SQL Editor de Supabase.

create type entry_status as enum ('in_progress', 'completed');
create type tournee_type as enum ('journee', 'matin', 'apres_midi');

alter table daily_entries
  add column status entry_status not null default 'completed',
  add column started_at timestamptz,
  add column ended_at timestamptz,
  add column tournee_type tournee_type,
  add column sector_id uuid references sectors (id),
  add column poses_delivered integer check (poses_delivered >= 0),
  add column poses_damaged integer check (poses_damaged >= 0),
  add column poses_not_delivered integer check (poses_not_delivered >= 0),
  add column poses_enlevement integer check (poses_enlevement >= 0),
  add column courses text;

-- L'écran "Démarrer" crée une ligne minimale (statut, started_at, secteur
-- par défaut) ; immatriculation/km ne sont saisis qu'à la fin de tournée.
-- Les contraintes NOT NULL d'origine bloqueraient cette insertion partielle.
alter table daily_entries alter column vehicle_registration drop not null;
alter table daily_entries alter column km_depart drop not null;
alter table daily_entries alter column km_arrivee drop not null;

-- Le nom exact de la contrainte de vérification dépend de la façon dont
-- Postgres l'a nommée à la création (peut différer d'une base à l'autre) :
-- on la retrouve dynamiquement plutôt que de parier sur un nom fixe.
do $$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.daily_entries'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%km_arrivee%'
  loop
    execute format('alter table daily_entries drop constraint %I', r.conname);
  end loop;
end $$;

alter table daily_entries add constraint daily_entries_km_check
  check (km_arrivee is null or km_depart is null or km_arrivee >= km_depart);

-- Une ligne = une tournée désormais (plus une journée) : un chauffeur qui
-- fait matin + après-midi a deux lignes le même jour.
do $$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.daily_entries'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%driver_id%'
      and pg_get_constraintdef(oid) ilike '%entry_date%'
  loop
    execute format('alter table daily_entries drop constraint %I', r.conname);
  end loop;
end $$;

create index daily_entries_driver_date_status_idx
  on daily_entries (driver_id, entry_date, status);
create index daily_entries_sector_idx on daily_entries (sector_id);

-- Pré-remplissage du secteur au démarrage + mémorisation du dernier choix.
alter table profiles add column default_sector_id uuid references sectors (id);
grant update (default_sector_id) on public.profiles to authenticated;

-- Démarrer/terminer une tournée doit refléter automatiquement l'état du
-- jour dans le calendrier. Jusqu'ici seul le patron pouvait écrire sur
-- `schedule` ; on ouvre un accès étroit au chauffeur : uniquement sa propre
-- ligne, uniquement pour aujourd'hui, uniquement type='tournee' — il ne
-- peut ni toucher une autre date, ni se déclarer 'conge'/'absence' lui-même.
create policy "schedule_driver_insert_own_tournee_today"
  on schedule for insert
  with check (
    driver_id = (select auth.uid())
    and type = 'tournee'
    and date = current_date
  );

create policy "schedule_driver_update_own_tournee_today"
  on schedule for update
  using (driver_id = (select auth.uid()) and date = current_date)
  with check (driver_id = (select auth.uid()) and type = 'tournee' and date = current_date);
