import type { Database } from "@/types/database";
import { resolveEntrySector, sectorThreshold, type Sector } from "@/lib/rentabilite";
import { entryTotal } from "@/lib/entries";
import type { ExportColumn, ExportRow } from "@/lib/export";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

export type GeodisRowType = "a_la_pose" | "forfait";

// Même paire théorique/réel pour les deux modèles de paiement, à chaque
// niveau (jour, tournée, total) — pas de cas spécial dans le code
// d'affichage (cf. demande explicite). Pour le forfait, théorique et réel
// sont toujours identiques (le forfait ne varie pas avec le volume) : ce
// n'est pas un raccourci, c'est le calcul explicite demandé.
export interface GeodisEntryRow {
  entryId: string;
  date: string;
  driverName: string;
  sectorId: string;
  sectorCode: string;
  type: GeodisRowType;
  // Poses — à la pose uniquement, null pour une ligne forfait (le concept
  // n'existe pas pour ce modèle de paiement).
  objectif: number | null;
  realise: number | null;
  pricePerPose: number | null;
  // Revenus en euros — présents pour les deux modèles (null seulement si le
  // prix/montant n'a pas été renseigné au moment de la clôture : affiché
  // "—", jamais 0€, cf. demande explicite).
  revenuTheorique: number | null;
  revenuReel: number | null;
  ecartEuros: number | null;
}

// Une ligne = une tournée terminée (à la pose ou forfait), avec le
// prix/montant figé à sa clôture (daily_entry_price_snapshots) — jamais la
// valeur courante du secteur, pour ne jamais recalculer rétroactivement un
// jour déjà clos (cf. demande explicite). Une tournée à la pose sans prix
// figé n'apparaît pas ici (comportement inchangé) ; une tournée forfait sans
// montant figé apparaît quand même, avec les revenus à null.
export function geodisEntryRow(
  entry: DailyEntry,
  sectorsById: Map<string, Sector>,
  priceSnapshotByEntryId: Map<string, number>,
  forfaitSnapshotByEntryId: Map<string, number>,
  driverNameById: Map<string, string>,
): GeodisEntryRow | null {
  if (entry.status !== "completed") return null;
  const sector = resolveEntrySector(entry, sectorsById);
  if (!sector) return null;

  const driverName = driverNameById.get(entry.driver_id) ?? "—";

  if (sector.payment_type === "forfait") {
    const forfaitAmount = forfaitSnapshotByEntryId.get(entry.id) ?? null;
    return {
      entryId: entry.id,
      date: entry.entry_date,
      driverName,
      sectorId: sector.id,
      sectorCode: sector.code,
      type: "forfait",
      objectif: null,
      realise: null,
      pricePerPose: null,
      revenuTheorique: forfaitAmount,
      revenuReel: forfaitAmount,
      ecartEuros: forfaitAmount !== null ? 0 : null,
    };
  }

  const objectif = sectorThreshold(sector);
  if (objectif === null) return null;
  const pricePerPose = priceSnapshotByEntryId.get(entry.id);
  if (pricePerPose === undefined) return null;

  const realise = entryTotal(entry);
  const revenuTheorique = objectif * pricePerPose;
  const revenuReel = realise * pricePerPose;

  return {
    entryId: entry.id,
    date: entry.entry_date,
    driverName,
    sectorId: sector.id,
    sectorCode: sector.code,
    type: "a_la_pose",
    objectif,
    realise,
    pricePerPose,
    revenuTheorique,
    revenuReel,
    ecartEuros: revenuReel - revenuTheorique,
  };
}

export function buildGeodisRows(
  entries: DailyEntry[],
  sectorsById: Map<string, Sector>,
  priceSnapshotByEntryId: Map<string, number>,
  forfaitSnapshotByEntryId: Map<string, number>,
  driverNameById: Map<string, string>,
): GeodisEntryRow[] {
  const rows: GeodisEntryRow[] = [];
  for (const entry of entries) {
    const row = geodisEntryRow(entry, sectorsById, priceSnapshotByEntryId, forfaitSnapshotByEntryId, driverNameById);
    if (row) rows.push(row);
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.sectorCode.localeCompare(b.sectorCode));
}

export interface SectorEcartSummary {
  sectorId: string;
  sectorCode: string;
  type: GeodisRowType;
  tourneesCount: number;
  revenuTheoriqueCumule: number;
  revenuReelCumule: number;
  ecartCumule: number;
  // Au moins une tournée sans prix/montant renseigné dans ce secteur — les
  // cumuls affichés sont donc un plancher, pas le revenu réel complet.
  hasUnpriced: boolean;
}

// Même agrégation pour les deux modèles de paiement : plus de distinction
// pertes/gains ici (le signe de l'écart cumulé, coloré, suffit — cf.
// demande explicite de ne pas dupliquer cette décomposition dans les KPI de
// synthèse).
export function aggregateEcartBySector(rows: GeodisEntryRow[]): SectorEcartSummary[] {
  const bySector = new Map<string, SectorEcartSummary>();
  for (const row of rows) {
    const acc = bySector.get(row.sectorId) ?? {
      sectorId: row.sectorId,
      sectorCode: row.sectorCode,
      type: row.type,
      tourneesCount: 0,
      revenuTheoriqueCumule: 0,
      revenuReelCumule: 0,
      ecartCumule: 0,
      hasUnpriced: false,
    };
    acc.revenuTheoriqueCumule += row.revenuTheorique ?? 0;
    acc.revenuReelCumule += row.revenuReel ?? 0;
    acc.ecartCumule += row.ecartEuros ?? 0;
    if (row.revenuTheorique === null) acc.hasUnpriced = true;
    acc.tourneesCount += 1;
    bySector.set(row.sectorId, acc);
  }
  return [...bySector.values()].sort((a, b) => a.ecartCumule - b.ecartCumule);
}

export function formatEuros(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)} €`;
}

export function formatDateFr(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(`${iso}T00:00:00`),
  );
}

// Colonnes + lignes d'export partagées par le tableau à l'écran et le PDF —
// le patron doit voir exactement ce qu'il envoie à Geodis (cf. demande
// explicite). Théorique/réel/écart à chaque ligne : un argument de
// négociation plus concret qu'un écart seul.
export const GEODIS_EXPORT_COLUMNS: ExportColumn[] = [
  { key: "date", label: "Date" },
  { key: "chauffeur", label: "Chauffeur" },
  { key: "tournee", label: "Tournée" },
  { key: "type", label: "Type" },
  { key: "objectif", label: "Objectif", numeric: true },
  { key: "realise", label: "Réalisé", numeric: true },
  { key: "revenuTheorique", label: "Revenu théorique (€)", numeric: true },
  { key: "revenuReel", label: "Revenu réel (€)", numeric: true },
  { key: "ecart", label: "Écart (€)", numeric: true },
];

// Le tableau exporté est complet (tous les jours, à la pose et forfait) avec
// les totaux bien visibles en bas — cf. demande explicite pour les
// négociations Geodis.
export function buildGeodisExportRows(rows: GeodisEntryRow[]): ExportRow[] {
  const exportRows: ExportRow[] = rows.map((r) => ({
    date: formatDateFr(r.date),
    chauffeur: r.driverName,
    tournee: r.sectorCode,
    type: r.type === "a_la_pose" ? "À la pose" : "Forfait",
    objectif: r.objectif ?? "—",
    realise: r.realise ?? "—",
    revenuTheorique: r.revenuTheorique !== null ? formatEuros(r.revenuTheorique) : "—",
    revenuReel: r.revenuReel !== null ? formatEuros(r.revenuReel) : "—",
    ecart: r.ecartEuros !== null ? formatEuros(r.ecartEuros) : "—",
  }));

  const totalTheorique = rows.reduce((sum, r) => sum + (r.revenuTheorique ?? 0), 0);
  const totalReel = rows.reduce((sum, r) => sum + (r.revenuReel ?? 0), 0);
  exportRows.push({
    date: "TOTAL",
    chauffeur: "",
    tournee: "",
    type: "",
    objectif: "",
    realise: "",
    revenuTheorique: formatEuros(totalTheorique),
    revenuReel: formatEuros(totalReel),
    ecart: formatEuros(totalReel - totalTheorique),
  });

  return exportRows;
}
