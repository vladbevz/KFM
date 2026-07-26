-- Durcissement de performance RLS (best practice Supabase), sans impact
-- mesurable à la volumétrie actuelle (~5 profils, ~30 lignes) mais correct
-- pour la suite : envelopper auth.uid() dans un sous-select pour que
-- Postgres le mémoïse une fois par requête plutôt que de le réévaluer par
-- ligne, et indexer profiles(role) puisque le boss filtre dessus.
-- À exécuter dans le SQL Editor de Supabase.

create index if not exists profiles_role_idx on public.profiles (role);

drop policy if exists "profiles_select_own_or_boss" on public.profiles;
create policy "profiles_select_own_or_boss"
  on public.profiles for select
  using (id = (select auth.uid()) or public.is_boss());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (id = (select auth.uid()));

drop policy if exists "daily_entries_select_own_or_boss" on public.daily_entries;
create policy "daily_entries_select_own_or_boss"
  on public.daily_entries for select
  using (driver_id = (select auth.uid()) or public.is_boss());

drop policy if exists "daily_entries_insert_own" on public.daily_entries;
create policy "daily_entries_insert_own"
  on public.daily_entries for insert
  with check (driver_id = (select auth.uid()));

drop policy if exists "daily_entries_update_own_within_24h" on public.daily_entries;
create policy "daily_entries_update_own_within_24h"
  on public.daily_entries for update
  using (
    driver_id = (select auth.uid())
    and created_at > now() - interval '24 hours'
  )
  with check (driver_id = (select auth.uid()));
