-- Notifications push (Module B). RLS "propriétaire uniquement" au sens
-- littéral (auth.uid() = user_id), pas restreint à is_boss() : le module ne
-- cible que le patron aujourd'hui côté UI, mais la table elle-même ne fait
-- aucune hypothèse sur le rôle pour rester ouverte à une extension future
-- (ex. chauffeur) sans migration supplémentaire.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  using (user_id = (select auth.uid()));

create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  with check (user_id = (select auth.uid()));

create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  using (user_id = (select auth.uid()));

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  panne_signalee boolean not null default true,
  echeance_proche boolean not null default true,
  echeance_depassee boolean not null default true,
  demande_conge boolean not null default true
);

alter table public.notification_preferences enable row level security;

create policy "notification_preferences_select_own"
  on public.notification_preferences for select
  using (user_id = (select auth.uid()));

create policy "notification_preferences_insert_own"
  on public.notification_preferences for insert
  with check (user_id = (select auth.uid()));

create policy "notification_preferences_update_own"
  on public.notification_preferences for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
