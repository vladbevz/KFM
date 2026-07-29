-- Module Documents chauffeurs : visite médicale, permis, FIMO, FCO...
-- À exécuter dans le SQL Editor de Supabase.

create table public.driver_documents (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  doc_name text not null,
  file_url text,
  expiry_date date,
  uploaded_at timestamptz not null default now()
);

alter table public.driver_documents enable row level security;

create index driver_documents_driver_expiry_idx
  on public.driver_documents (driver_id, expiry_date);

-- Informations personnelles sensibles : visibles par le patron et le
-- chauffeur concerné uniquement, jamais par les autres chauffeurs. Pas
-- d'écran chauffeur dans cette version, mais la RLS est prête.
create policy "driver_documents_select_own_or_boss"
  on public.driver_documents for select
  using (driver_id = (select auth.uid()) or public.is_boss());

create policy "driver_documents_boss_insert"
  on public.driver_documents for insert with check (public.is_boss());

create policy "driver_documents_boss_update"
  on public.driver_documents for update using (public.is_boss()) with check (public.is_boss());

create policy "driver_documents_boss_delete"
  on public.driver_documents for delete using (public.is_boss());

-- Bucket Storage privé, chemin {driver_id}/{filename} (même convention que
-- vehicle-issues) : le chauffeur concerné peut lire, seul le patron écrit
-- (aucun upload chauffeur dans cette version).
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
