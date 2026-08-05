import type { Database } from "@/types/database";
import { sectorThreshold, resolveEntrySector, entryProfitability, type Sector } from "@/lib/rentabilite";
import {
  entryKm,
  entryPosesBreakdown,
  entryPoses,
  entryEnlevements,
  entryTotal,
  type PosesBreakdown,
} from "@/lib/entries";

export { entryKm, entryPosesBreakdown, entryPoses, entryEnlevements, entryTotal };
export type { PosesBreakdown };

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

export type PeriodKey = "today" | "7" | "30" | "90" | "custom";

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "7", label: "7 jours" },
  { key: "30", label: "30 jours" },
  { key: "90", label: "3 mois" },
  { key: "custom", label: "Personnalisé" },
];

export type Metric = "km" | "poses" | "enlevements";

export const METRIC_OPTIONS: { key: Metric; label: string; color: string }[] = [
  { key: "km", label: "Kilomètres", color: "#f59e0b" },
  { key: "poses", label: "Poses (livraison)", color: "#3b82f6" },
  { key: "enlevements", label: "Enlèvements", color: "#22c55e" },
];

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getPeriodRange(
  period: PeriodKey,
  customFrom: string | null,
  customTo: string | null,
): { from: string; to: string } {
  const today = new Date();
  const to = toISODate(today);

  if (period === "custom" && customFrom && customTo) {
    return { from: customFrom, to: customTo };
  }

  if (period === "today") {
    return { from: to, to };
  }

  const days = period === "7" ? 7 : period === "30" ? 30 : 90;
  const from = new Date(today);
  from.setDate(from.getDate() - (days - 1));

  return { from: toISODate(from), to };
}

// Période précédente de même durée (ex. semaine actuelle vs semaine
// précédente), pour le calcul de tendance du tableau comparatif. Reste
// entièrement en UTC (Date.UTC + diff en millisecondes) pour ne jamais
// passer par une conversion de fuseau local — même précédent que le
// correctif de shiftDate (RentabiliteDateControl), qui perdait/gagnait un
// jour avec un offset local positif.
export function getPreviousPeriodRange(from: string, to: string): { from: string; to: string } {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const fromUTC = Date.UTC(fy, fm - 1, fd);
  const toUTC = Date.UTC(ty, tm - 1, td);
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.round((toUTC - fromUTC) / dayMs) + 1;

  const prevToUTC = fromUTC - dayMs;
  const prevFromUTC = prevToUTC - (days - 1) * dayMs;

  return {
    from: new Date(prevFromUTC).toISOString().slice(0, 10),
    to: new Date(prevToUTC).toISOString().slice(0, 10),
  };
}

export interface DateMetrics {
  date: string;
  km: number;
  poses: number;
  enlevements: number;
}

export function aggregateByDate(entries: DailyEntry[]): DateMetrics[] {
  const byDate = new Map<string, DateMetrics>();

  for (const entry of entries) {
    const current = byDate.get(entry.entry_date) ?? {
      date: entry.entry_date,
      km: 0,
      poses: 0,
      enlevements: 0,
    };
    current.km += entryKm(entry);
    current.poses += entryPoses(entry);
    current.enlevements += entryEnlevements(entry);
    byDate.set(entry.entry_date, current);
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export interface PosesDateMetrics {
  date: string;
  delivered: number;
  damaged: number;
  notDelivered: number;
  enlevements: number;
  threshold: number | null;
}

// Pour le graphique empilé (module 9) : poses par catégorie + enlèvements +
// seuil de rentabilité du jour, sommés sur toutes les tournées de ce
// jour-là (un chauffeur qui fait deux demi-journées a deux lignes le même
// jour). Le volume total comparé au seuil = poses + enlèvements.
export function aggregatePosesByDate(
  entries: DailyEntry[],
  sectorsById: Map<string, Sector>,
): PosesDateMetrics[] {
  const byDate = new Map<string, PosesDateMetrics>();

  for (const entry of entries) {
    const current = byDate.get(entry.entry_date) ?? {
      date: entry.entry_date,
      delivered: 0,
      damaged: 0,
      notDelivered: 0,
      enlevements: 0,
      threshold: null,
    };
    const breakdown = entryPosesBreakdown(entry);
    current.delivered += breakdown.delivered;
    current.damaged += breakdown.damaged;
    current.notDelivered += breakdown.notDelivered;
    current.enlevements += entryEnlevements(entry);

    const sector = resolveEntrySector(entry, sectorsById);
    const threshold = sectorThreshold(sector);
    if (threshold !== null) {
      current.threshold = (current.threshold ?? 0) + threshold;
    }

    byDate.set(entry.entry_date, current);
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export interface DriverMetrics {
  driverId: string;
  fullName: string;
  jours: number;
  totalKm: number;
  totalPoses: number;
  totalEnlevements: number;
}

export function aggregateByDriver(
  entries: DailyEntry[],
  drivers: { id: string; full_name: string }[],
): DriverMetrics[] {
  const byDriver = new Map<string, DriverMetrics>();

  for (const driver of drivers) {
    byDriver.set(driver.id, {
      driverId: driver.id,
      fullName: driver.full_name,
      jours: 0,
      totalKm: 0,
      totalPoses: 0,
      totalEnlevements: 0,
    });
  }

  for (const entry of entries) {
    const current = byDriver.get(entry.driver_id);
    if (!current) continue;
    current.jours += 1;
    current.totalKm += entryKm(entry);
    current.totalPoses += entryPoses(entry);
    current.totalEnlevements += entryEnlevements(entry);
  }

  return Array.from(byDriver.values());
}

export function sumLitersByDriver(fuelLogs: { driver_id: string; liters: number }[]): Map<string, number> {
  const byDriver = new Map<string, number>();
  for (const log of fuelLogs) {
    byDriver.set(log.driver_id, (byDriver.get(log.driver_id) ?? 0) + Number(log.liters));
  }
  return byDriver;
}

export interface DriverStatsRow {
  driverId: string;
  fullName: string;
  totalKm: number;
  avgKmPerDay: number | null;
  totalPoses: number;
  avgPosesPerDay: number | null;
  totalEnlevements: number;
  avgTotalPerDay: number | null;
  totalLiters: number;
  totalIncidents: number;
  seuilsAtteints: number;
  seuilsNonAtteints: number;
  tauxReussite: number | null;
  joursTravailles: number;
}

// Tableau comparatif enrichi (Statistiques -> Tableau). Seules les entrées
// terminées comptent pour les moyennes par jour travaillé (règle explicite :
// pas de dilution par les jours calendaires non travaillés). Tous les
// chauffeurs actifs apparaissent, même sans activité — même précédent que
// aggregateByDriver/aggregateRentabiliteByDriver.
export function aggregateDriverStats(
  entries: DailyEntry[],
  drivers: { id: string; full_name: string }[],
  sectorsById: Map<string, Sector>,
  litersByDriver: Map<string, number>,
): DriverStatsRow[] {
  const byDriver = new Map<
    string,
    {
      dates: Set<string>;
      totalKm: number;
      totalPoses: number;
      totalEnlevements: number;
      totalIncidents: number;
      seuilsAtteints: number;
      seuilsNonAtteints: number;
    }
  >();
  for (const driver of drivers) {
    byDriver.set(driver.id, {
      dates: new Set(),
      totalKm: 0,
      totalPoses: 0,
      totalEnlevements: 0,
      totalIncidents: 0,
      seuilsAtteints: 0,
      seuilsNonAtteints: 0,
    });
  }

  for (const entry of entries) {
    if (entry.status !== "completed") continue;
    const acc = byDriver.get(entry.driver_id);
    if (!acc) continue;

    acc.dates.add(entry.entry_date);
    acc.totalKm += entryKm(entry);
    acc.totalPoses += entryPoses(entry);
    acc.totalEnlevements += entryEnlevements(entry);

    const breakdown = entryPosesBreakdown(entry);
    acc.totalIncidents += breakdown.damaged + breakdown.notDelivered;

    const sector = resolveEntrySector(entry, sectorsById);
    const status = entryProfitability(entry, sector);
    if (status.kind === "a_la_pose") {
      if (status.check.met) acc.seuilsAtteints += 1;
      else acc.seuilsNonAtteints += 1;
    }
  }

  return drivers.map((driver) => {
    const acc = byDriver.get(driver.id)!;
    const joursTravailles = acc.dates.size;
    const seuilsTotal = acc.seuilsAtteints + acc.seuilsNonAtteints;

    return {
      driverId: driver.id,
      fullName: driver.full_name,
      totalKm: acc.totalKm,
      avgKmPerDay: joursTravailles > 0 ? acc.totalKm / joursTravailles : null,
      totalPoses: acc.totalPoses,
      avgPosesPerDay: joursTravailles > 0 ? acc.totalPoses / joursTravailles : null,
      totalEnlevements: acc.totalEnlevements,
      avgTotalPerDay:
        joursTravailles > 0 ? (acc.totalPoses + acc.totalEnlevements) / joursTravailles : null,
      totalLiters: litersByDriver.get(driver.id) ?? 0,
      totalIncidents: acc.totalIncidents,
      seuilsAtteints: acc.seuilsAtteints,
      seuilsNonAtteints: acc.seuilsNonAtteints,
      tauxReussite: seuilsTotal > 0 ? (acc.seuilsAtteints / seuilsTotal) * 100 : null,
      joursTravailles,
    };
  });
}
