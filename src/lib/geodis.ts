import type { Database } from "@/types/database";
import { resolveEntrySector, sectorThreshold, type Sector } from "@/lib/rentabilite";
import { entryTotal } from "@/lib/entries";
import type { ExportColumn, ExportRow } from "@/lib/export";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

export type GeodisRowType = "a_la_pose" | "forfait";

export interface GeodisEntryRow {
  entryId: string;
  date: string;
  driverName: string;
  sectorId: string;
  sectorCode: string;
  type: GeodisRowType;
  // À la pose uniquement — null pour une ligne forfait (le concept
  // d'objectif/écart n'existe pas pour ce modèle de paiement).
  objectif: number | null;
  realise: number | null;
  ecartPoses: number | null;
  pricePerPose: number | null;
  ecartEuros: number | null;
  // Forfait uniquement — null si le montant n'a pas été renseigné pour ce
  // secteur au moment de la clôture (affiché "—", jamais 0€ : cf. demande
  // explicite, un 0€ serait trompeur).
  forfaitAmount: number | null;
}

// Contribution de cette ligne au revenu total : l'écart pour une tournée à
// la pose (peut être négatif), le montant forfait complet pour une tournée
// forfait (jamais négatif — c'est la définition même du forfait). Un
// montant forfait non renseigné compte pour 0 dans les totaux (mais reste
// affiché "—" ligne par ligne, cf. buildGeodisExportRows/GeodisSectorTable).
export function rowRevenue(row: GeodisEntryRow): number {
  return row.type === "a_la_pose" ? (row.ecartEuros ?? 0) : (row.forfaitAmount ?? 0);
}

// Une ligne = une tournée terminée (à la pose ou forfait), avec le
// prix/montant figé à sa clôture (daily_entry_price_snapshots) — jamais la
// valeur courante du secteur, pour ne jamais recalculer rétroactivement un
// jour déjà clos (cf. demande explicite). Une tournée à la pose sans prix
// figé n'apparaît pas ici (comportement inchangé) ; une tournée forfait sans
// montant figé apparaît quand même, avec forfaitAmount à null.
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
    return {
      entryId: entry.id,
      date: entry.entry_date,
      driverName,
      sectorId: sector.id,
      sectorCode: sector.code,
      type: "forfait",
      objectif: null,
      realise: null,
      ecartPoses: null,
      pricePerPose: null,
      ecartEuros: null,
      forfaitAmount: forfaitSnapshotByEntryId.get(entry.id) ?? null,
    };
  }

  const objectif = sectorThreshold(sector);
  if (objectif === null) return null;
  const pricePerPose = priceSnapshotByEntryId.get(entry.id);
  if (pricePerPose === undefined) return null;

  const realise = entryTotal(entry);
  const ecartPoses = realise - objectif;

  return {
    entryId: entry.id,
    date: entry.entry_date,
    driverName,
    sectorId: sector.id,
    sectorCode: sector.code,
    type: "a_la_pose",
    objectif,
    realise,
    ecartPoses,
    pricePerPose,
    ecartEuros: ecartPoses * pricePerPose,
    forfaitAmount: null,
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
  // À la pose : net (peut être négatif). Forfait : revenu total (jamais
  // négatif).
  totalEcartEuros: number;
  // Cumuls séparés du net, à la pose uniquement (0 pour un secteur forfait,
  // le concept perte/gain n'existe pas) : le patron doit voir les deux, pas
  // seulement le solde (cf. demande explicite).
  totalPertes: number;
  totalGains: number;
  tourneesCount: number;
  // Au moins une tournée forfait sans montant renseigné dans ce secteur —
  // le total affiché est donc un plancher, pas le revenu réel complet.
  hasUnpriced: boolean;
}

export function aggregateEcartBySector(rows: GeodisEntryRow[]): SectorEcartSummary[] {
  const bySector = new Map<string, SectorEcartSummary>();
  for (const row of rows) {
    const acc = bySector.get(row.sectorId) ?? {
      sectorId: row.sectorId,
      sectorCode: row.sectorCode,
      type: row.type,
      totalEcartEuros: 0,
      totalPertes: 0,
      totalGains: 0,
      tourneesCount: 0,
      hasUnpriced: false,
    };
    const revenue = rowRevenue(row);
    acc.totalEcartEuros += revenue;
    if (row.type === "a_la_pose") {
      if (revenue < 0) acc.totalPertes += revenue;
      else if (revenue > 0) acc.totalGains += revenue;
    } else if (row.forfaitAmount === null) {
      acc.hasUnpriced = true;
    }
    acc.tourneesCount += 1;
    bySector.set(row.sectorId, acc);
  }
  return [...bySector.values()].sort((a, b) => a.totalEcartEuros - b.totalEcartEuros);
}

export function formatEuros(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)} €`;
}

function formatDateFr(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(`${iso}T00:00:00`),
  );
}

// Colonnes + lignes d'export partagées par le tableau à l'écran et le PDF —
// le patron doit voir exactement ce qu'il envoie à Geodis (cf. demande
// explicite : "Le tableau à l'écran affiche la même chose que le PDF"). Une
// seule table pour les deux modèles de paiement : "Revenu (€)" porte
// l'écart à la pose ou le montant forfait selon la ligne, ce qui permet la
// somme "Revenu total" directement sur cette colonne.
export const GEODIS_EXPORT_COLUMNS: ExportColumn[] = [
  { key: "date", label: "Date" },
  { key: "chauffeur", label: "Chauffeur" },
  { key: "tournee", label: "Tournée" },
  { key: "type", label: "Type" },
  { key: "objectif", label: "Objectif", numeric: true },
  { key: "realise", label: "Réalisé", numeric: true },
  { key: "ecartPoses", label: "Écart (poses)", numeric: true },
  { key: "prixParPose", label: "Prix/pose", numeric: true },
  { key: "revenu", label: "Revenu (€)", numeric: true },
];

// Le tableau exporté est complet (tous les jours, à la pose et forfait, perte
// ou gain) avec le revenu total du mois bien visible en bas — cf. demande
// explicite pour les négociations Geodis.
export function buildGeodisExportRows(rows: GeodisEntryRow[]): ExportRow[] {
  const exportRows: ExportRow[] = rows.map((r) => ({
    date: formatDateFr(r.date),
    chauffeur: r.driverName,
    tournee: r.sectorCode,
    type: r.type === "a_la_pose" ? "À la pose" : "Forfait",
    objectif: r.objectif ?? "—",
    realise: r.realise ?? "—",
    ecartPoses: r.ecartPoses !== null ? (r.ecartPoses > 0 ? `+${r.ecartPoses}` : r.ecartPoses) : "—",
    prixParPose: r.pricePerPose !== null ? r.pricePerPose.toFixed(2) : "—",
    revenu:
      r.type === "a_la_pose"
        ? formatEuros(r.ecartEuros!)
        : r.forfaitAmount !== null
          ? formatEuros(r.forfaitAmount)
          : "—",
  }));

  const totalEuros = rows.reduce((sum, r) => sum + rowRevenue(r), 0);
  exportRows.push({
    date: "REVENU TOTAL",
    chauffeur: "",
    tournee: "",
    type: "",
    objectif: "",
    realise: "",
    ecartPoses: "",
    prixParPose: "",
    revenu: formatEuros(totalEuros),
  });

  return exportRows;
}
