-- Suivi des réparations et coûts par véhicule, avec facture optionnelle.
-- Même schéma RLS que vehicle_documents (boss uniquement, contrairement à
-- vehicle_issues qui autorise aussi les chauffeurs).

create table if not exists vehicle_repairs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  vehicle_issue_id uuid references vehicle_issues (id) on delete set null,
  description text not null,
  cost numeric not null check (cost >= 0),
  repaired_at date not null default current_date,
  invoice_url text,
  created_at timestamptz not null default now()
);

alter table vehicle_repairs enable row level security;

create index vehicle_repairs_vehicle_idx on vehicle_repairs (vehicle_id, repaired_at desc);

create policy "vehicle_repairs_boss_select"
  on vehicle_repairs for select using (public.is_boss());

create policy "vehicle_repairs_boss_insert"
  on vehicle_repairs for insert with check (public.is_boss());

create policy "vehicle_repairs_boss_update"
  on vehicle_repairs for update using (public.is_boss()) with check (public.is_boss());

create policy "vehicle_repairs_boss_delete"
  on vehicle_repairs for delete using (public.is_boss());

insert into storage.buckets (id, name, public)
values ('vehicle-repairs', 'vehicle-repairs', false)
on conflict (id) do nothing;

create policy "vehicle_repairs_files_boss_all"
  on storage.objects for all to authenticated
  using (bucket_id = 'vehicle-repairs' and public.is_boss())
  with check (bucket_id = 'vehicle-repairs' and public.is_boss());
