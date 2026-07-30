import type { Database } from "@/types/database";
import { sectorThreshold, resolveEntrySector, type Sector } from "@/lib/rentabilite";
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
