import type { Database } from "@/types/database";
import { resolveEntrySector, sectorThreshold, type Sector } from "@/lib/rentabilite";
import { entryTotal } from "@/lib/entries";
import type { ExportColumn, ExportRow } from "@/lib/export";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

export interface GeodisEntryRow {
  entryId: string;
  date: string;
  driverName: string;
  sectorId: string;
  sectorCode: string;
  objectif: number;
  realise: number;
  ecartPoses: number;
  pricePerPose: number;
  ecartEuros: number;
}

// Une ligne = une tournée à la pose terminée, avec le prix figé à sa
// clôture (daily_entry_price_snapshots) — jamais le prix courant du secteur,
// pour ne jamais recalculer rétroactivement un jour déjà clos (cf. demande
// explicite). Une tournée sans prix figé (clôturée avant que le patron ne
// renseigne un prix pour ce secteur) n'apparaît simplement pas ici.
export function geodisEntryRow(
  entry: DailyEntry,
  sectorsById: Map<string, Sector>,
  priceSnapshotByEntryId: Map<string, number>,
  driverNameById: Map<string, string>,
): GeodisEntryRow | null {
  if (entry.status !== "completed") return null;
  const sector = resolveEntrySector(entry, sectorsById);
  if (!sector || sector.payment_type !== "a_la_pose") return null;
  const objectif = sectorThreshold(sector);
  if (objectif === null) return null;
  const pricePerPose = priceSnapshotByEntryId.get(entry.id);
  if (pricePerPose === undefined) return null;

  const realise = entryTotal(entry);
  const ecartPoses = realise - objectif;

  return {
    entryId: entry.id,
    date: entry.entry_date,
    driverName: driverNameById.get(entry.driver_id) ?? "—",
    sectorId: sector.id,
    sectorCode: sector.code,
    objectif,
    realise,
    ecartPoses,
    pricePerPose,
    ecartEuros: ecartPoses * pricePerPose,
  };
}

export function buildGeodisRows(
  entries: DailyEntry[],
  sectorsById: Map<string, Sector>,
  priceSnapshotByEntryId: Map<string, number>,
  driverNameById: Map<string, string>,
): GeodisEntryRow[] {
  const rows: GeodisEntryRow[] = [];
  for (const entry of entries) {
    const row = geodisEntryRow(entry, sectorsById, priceSnapshotByEntryId, driverNameById);
    if (row) rows.push(row);
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.sectorCode.localeCompare(b.sectorCode));
}

export interface SectorEcartSummary {
  sectorId: string;
  sectorCode: string;
  totalEcartEuros: number;
  // Cumuls séparés du net : le patron doit voir les deux, pas seulement le
  // solde (cf. demande explicite) — un secteur à +200€ net peut cacher
  // -800€ de pertes compensées par +1000€ de gains, information perdue si
  // on n'affiche que le net.
  totalPertes: number;
  totalGains: number;
  tourneesCount: number;
}

export function aggregateEcartBySector(rows: GeodisEntryRow[]): SectorEcartSummary[] {
  const bySector = new Map<string, SectorEcartSummary>();
  for (const row of rows) {
    const acc = bySector.get(row.sectorId) ?? {
      sectorId: row.sectorId,
      sectorCode: row.sectorCode,
      totalEcartEuros: 0,
      totalPertes: 0,
      totalGains: 0,
      tourneesCount: 0,
    };
    acc.totalEcartEuros += row.ecartEuros;
    if (row.ecartEuros < 0) acc.totalPertes += row.ecartEuros;
    else if (row.ecartEuros > 0) acc.totalGains += row.ecartEuros;
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
// explicite : "Le tableau à l'écran affiche la même chose que le PDF").
export const GEODIS_EXPORT_COLUMNS: ExportColumn[] = [
  { key: "date", label: "Date" },
  { key: "chauffeur", label: "Chauffeur" },
  { key: "tournee", label: "Tournée" },
  { key: "objectif", label: "Objectif", numeric: true },
  { key: "realise", label: "Réalisé", numeric: true },
  { key: "ecartPoses", label: "Écart (poses)", numeric: true },
  { key: "prixParPose", label: "Prix/pose", numeric: true },
  { key: "ecartEuros", label: "Écart (€)", numeric: true },
];

// Le tableau exporté est complet (tous les jours, perte ou gain) avec le
// total du mois bien visible en bas — cf. demande explicite pour les
// négociations Geodis.
export function buildGeodisExportRows(rows: GeodisEntryRow[]): ExportRow[] {
  const exportRows: ExportRow[] = rows.map((r) => ({
    date: formatDateFr(r.date),
    chauffeur: r.driverName,
    tournee: r.sectorCode,
    objectif: r.objectif,
    realise: r.realise,
    ecartPoses: r.ecartPoses > 0 ? `+${r.ecartPoses}` : r.ecartPoses,
    prixParPose: r.pricePerPose.toFixed(2),
    ecartEuros: formatEuros(r.ecartEuros),
  }));

  const totalEuros = rows.reduce((sum, r) => sum + r.ecartEuros, 0);
  exportRows.push({
    date: "TOTAL",
    chauffeur: "",
    tournee: "",
    objectif: "",
    realise: "",
    ecartPoses: "",
    prixParPose: "",
    ecartEuros: formatEuros(totalEuros),
  });

  return exportRows;
}
