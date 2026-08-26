-- Module A (écart de rentabilité / manque à gagner Geodis) + Module B
-- (anti-triche déclaration/détail).
--
-- Le prix par pose et le prix figé par tournée ne doivent JAMAIS être
-- lisibles par un chauffeur, même via un futur select("*") côté chauffeur
-- sur sectors/daily_entries — RLS ne filtre que des lignes entières, pas des
-- colonnes isolées dans une table déjà ouverte en lecture aux chauffeurs.
-- D'où deux tables dédiées, chacune avec sa propre policy is_boss() only,
-- plutôt que des colonnes sur sectors/daily_entries.

-- Prix actuel par secteur (à la pose uniquement), modifiable par le patron
-- depuis "Gérer les tournées". Une seule ligne par secteur ; son absence
-- équivaut à "prix non renseigné".
create table if not exists public.sector_prices (
  sector_id uuid primary key references public.sectors (id) on delete cascade,
  price_per_pose numeric,
  updated_at timestamptz not null default now()
);

alter table public.sector_prices enable row level security;

create policy "sector_prices_boss_only"
  on public.sector_prices for all
  using (public.is_boss())
  with check (public.is_boss());

-- Prix figé au moment où la tournée passe à 'completed' : un changement de
-- prix sur sector_prices ne doit jamais modifier rétroactivement l'écart en
-- euros d'une tournée déjà close (comportement standard pour ne pas fausser
-- un mois déjà clos, cf. demande explicite).
create table if not exists public.daily_entry_price_snapshots (
  entry_id uuid primary key references public.daily_entries (id) on delete cascade,
  price_per_pose numeric not null,
  created_at timestamptz not null default now()
);

alter table public.daily_entry_price_snapshots enable row level security;

create policy "daily_entry_price_snapshots_boss_only"
  on public.daily_entry_price_snapshots for all
  using (public.is_boss())
  with check (public.is_boss());

-- Module B : nombre de poses+enlèvements annoncées par le dispatch au
-- chauffeur au démarrage de la tournée (écran 1), verrouillé ensuite. Reste
-- sur daily_entries (pas de secret côté chauffeur — c'est lui qui le saisit)
-- ; comparé au détail saisi à l'écran 3 pour bloquer une incohérence.
alter table public.daily_entries add column if not exists dispatch_declared_total integer;
