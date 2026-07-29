-- Module Documents véhicules : assurance, carte grise, contrôle technique...
-- À exécuter dans le SQL Editor de Supabase.

create table public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  doc_name text not null,
  file_url text not null,
  expiry_date date,
  uploaded_at timestamptz not null default now()
);

alter table public.vehicle_documents enable row level security;

create index vehicle_documents_vehicle_expiry_idx
  on public.vehicle_documents (vehicle_id, expiry_date);

-- Réservé au patron : les chauffeurs n'ont pas besoin de voir les papiers
-- des véhicules.
create policy "vehicle_documents_boss_select"
  on public.vehicle_documents for select using (public.is_boss());

create policy "vehicle_documents_boss_insert"
  on public.vehicle_documents for insert with check (public.is_boss());

create policy "vehicle_documents_boss_update"
  on public.vehicle_documents for update using (public.is_boss()) with check (public.is_boss());

create policy "vehicle_documents_boss_delete"
  on public.vehicle_documents for delete using (public.is_boss());

-- Bucket Storage privé, accès patron uniquement.
insert into storage.buckets (id, name, public)
values ('vehicle-documents', 'vehicle-documents', false)
on conflict (id) do nothing;

create policy "vehicle_documents_files_boss_all"
  on storage.objects for all to authenticated
  using (bucket_id = 'vehicle-documents' and public.is_boss())
  with check (bucket_id = 'vehicle-documents' and public.is_boss());
