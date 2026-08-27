-- Note vocale sur le signalement de panne : alternative au texte, pas un
-- remplacement (au moins l'un des deux — description ou note vocale — doit
-- être renseigné, jamais aucun des deux). Même schéma que la photo : colonne
-- nullable + bucket Storage privé dédié avec le même pattern de policies
-- (chemin {driver_id}/{filename}, insert own, select own-or-boss).

alter table public.vehicle_issues add column if not exists voice_url text;

-- report_vehicle_issue change de signature (nouveau paramètre) : create or
-- replace avec une liste d'arguments différente créerait une surcharge en
-- plus de l'ancienne fonction au lieu de la remplacer — on la supprime donc
-- explicitement d'abord.
drop function if exists public.report_vehicle_issue(uuid, public.vehicle_status, text, text);

create or replace function public.report_vehicle_issue(
  p_vehicle_id uuid,
  p_new_status public.vehicle_status,
  p_description text,
  p_photo_url text default null,
  p_voice_url text default null
) returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_new_status not in ('issue_running', 'unavailable') then
    raise exception 'invalid status for driver report: %', p_new_status;
  end if;

  insert into public.vehicle_issues (vehicle_id, reported_by, description, photo_url, voice_url)
  values (p_vehicle_id, auth.uid(), p_description, p_photo_url, p_voice_url);

  update public.vehicles set status = p_new_status where id = p_vehicle_id;
end;
$$;

revoke all on function public.report_vehicle_issue(uuid, public.vehicle_status, text, text, text) from public;
grant execute on function public.report_vehicle_issue(uuid, public.vehicle_status, text, text, text) to authenticated;

-- Bucket Storage privé pour les notes vocales de panne. Chemin attendu :
-- {driver_id}/{filename} — même pattern que vehicle-issues (photos).
insert into storage.buckets (id, name, public)
values ('panne-audio', 'panne-audio', false)
on conflict (id) do nothing;

create policy "panne_audio_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'panne-audio'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "panne_audio_select_own_or_boss"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'panne-audio'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.is_boss()
    )
  );
