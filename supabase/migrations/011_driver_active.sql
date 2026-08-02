-- Statut actif/désactivé pour les comptes chauffeur. Un chauffeur désactivé
-- ne peut plus se connecter (géré côté fonctions serveur, cf.
-- src/app/patron/chauffeurs/admin-actions.ts) mais son historique
-- (daily_entries, fuel_logs, vehicle_issues...) reste intact.
-- À exécuter dans le SQL Editor de Supabase.

alter table profiles add column active boolean not null default true;

-- Pas de grant update (active) côté authenticated : contrairement à
-- full_name/default_sector_id, cette colonne n'est modifiable que via le
-- service role (les fonctions serveur ci-dessus) — aucune policy RLS
-- supplémentaire n'est donc nécessaire.

create index profiles_active_idx on profiles (role, active);
