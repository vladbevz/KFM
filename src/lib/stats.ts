import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

export type PeriodKey = "7" | "30" | "90" | "custom";

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
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

  const days = period === "7" ? 7 : period === "30" ? 30 : 90;
  const from = new Date(today);
  from.setDate(from.getDate() - (days - 1));

  return { from: toISODate(from), to };
}

export function entryKm(entry: DailyEntry): number {
  return Math.max(0, entry.km_arrivee - entry.km_depart);
}

export function entryPoses(entry: DailyEntry): number {
  return (entry.matin_poses_livraison ?? 0) + (entry.apres_midi_poses_livraison ?? 0);
}

export function entryEnlevements(entry: DailyEntry): number {
  return (entry.matin_poses_enlevement ?? 0) + (entry.apres_midi_poses_enlevement ?? 0);
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

export interface DriverMetrics {
  driverId: string;
  fullName: string;
  jours: number;
  totalKm: number;
  totalPoses: number;
  totalEnlevements: number;
  avgKm: number;
  avgPoses: number;
  avgEnlevements: number;
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
      avgKm: 0,
      avgPoses: 0,
      avgEnlevements: 0,
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

  for (const driver of byDriver.values()) {
    if (driver.jours > 0) {
      driver.avgKm = Math.round(driver.totalKm / driver.jours);
      driver.avgPoses = Math.round((driver.totalPoses / driver.jours) * 10) / 10;
      driver.avgEnlevements =
        Math.round((driver.totalEnlevements / driver.jours) * 10) / 10;
    }
  }

  return Array.from(byDriver.values());
}
