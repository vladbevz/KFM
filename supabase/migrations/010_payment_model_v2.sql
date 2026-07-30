-- Nouveau modèle de paiement : à la pose / forfait (remplace le composite
-- matin/après-midi/forfait/quantité). Type de tournée simplifié : journée
-- / demi-journée. À exécuter dans le SQL Editor de Supabase.
--
-- Effet de bord attendu : les secteurs existants perdent leurs seuils
-- actuels et repassent en 'a_la_pose' avec rentability_target = NULL — à
-- reconfigurer manuellement dans l'écran Secteurs après la migration.

drop type if exists payment_model cascade;
create type payment_type as enum ('a_la_pose', 'forfait');

alter table sectors
  drop column if exists morning_threshold,
  drop column if exists afternoon_threshold,
  drop column if exists day_threshold;

alter table sectors
  add column payment_type payment_type not null default 'a_la_pose',
  add column rentability_target integer;

-- DROP TYPE ... CASCADE supprime aussi la colonne daily_entries.tournee_type
-- qui en dépend (elle ne peut donc pas être "convertie" par un simple ALTER
-- COLUMN TYPE comme un premier jet le suggérait — on la rajoute à neuf).
-- Les anciennes valeurs (journee/matin/apres_midi) sont perdues, comme
-- attendu.
drop type if exists tournee_type cascade;
create type tournee_type as enum ('journee', 'demi_journee');
alter table daily_entries add column tournee_type tournee_type;
