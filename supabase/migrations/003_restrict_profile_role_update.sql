-- Faille de sécurité : la policy "profiles_update_own" autorise la mise à
-- jour de la ligne, mais sans restriction de colonnes — un chauffeur pouvait
-- donc s'auto-promouvoir "boss" via un appel API direct (role = auth.uid()'s
-- own row, mais n'importe quelle colonne, y compris `role`).
--
-- Correctif : seule la colonne full_name reste modifiable par le rôle
-- `authenticated`. Le changement de rôle doit se faire manuellement
-- (Table Editor Supabase ou service role), jamais depuis le client.
-- À exécuter dans le SQL Editor de Supabase.

revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- Même problème sur daily_entries : la policy UPDATE n'empêchait pas un
-- chauffeur de réassigner sa propre ligne à un autre driver_id via l'API.
-- Le WITH CHECK garantit que driver_id reste inchangé après modification.
drop policy if exists "daily_entries_update_own_within_24h" on public.daily_entries;
create policy "daily_entries_update_own_within_24h"
  on public.daily_entries for update
  using (
    driver_id = auth.uid()
    and created_at > now() - interval '24 hours'
  )
  with check (driver_id = auth.uid());
