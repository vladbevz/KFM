import type { Database, PaymentType } from "@/types/database";
import { entryTotal } from "@/lib/entries";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];
export type Sector = Database["public"]["Tables"]["sectors"]["Row"];

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  a_la_pose: "À la pose",
  forfait: "Forfait",
};

export interface ThresholdCheck {
  actual: number;
  threshold: number;
  met: boolean;
}

export type ProfitabilityStatus =
  | { kind: "none" }
  | { kind: "forfait" }
  | { kind: "a_la_pose"; check: ThresholdCheck };

type SectorRef = Pick<DailyEntry, "sector_id" | "matin_sector_id" | "apres_midi_sector_id">;

// Le secteur "canonique" d'une ligne : sector_id pour une tournée du
// nouveau flux, sinon repli sur matin_sector_id/apres_midi_sector_id pour
// une ligne historique (ancien modèle "une ligne = un jour").
export function resolveEntrySector(entry: SectorRef, sectorsById: Map<string, Sector>): Sector | null {
  const id = entry.sector_id ?? entry.matin_sector_id ?? entry.apres_midi_sector_id;
  return id ? (sectorsById.get(id) ?? null) : null;
}

// Objectif de rentabilité applicable à un secteur, ou null si "forfait"
// (rien à chiffrer). Ne dépend plus que du secteur : un seul objectif par
// secteur, quelle que soit la ligne (journée ou demi-journée).
export function sectorThreshold(sector: Sector | null): number | null {
  if (!sector || sector.payment_type === "forfait") return null;
  return sector.rentability_target ?? 0;
}

export function entryProfitability(entry: DailyEntry, sector: Sector | null): ProfitabilityStatus {
  if (!sector) return { kind: "none" };
  if (sector.payment_type === "forfait") return { kind: "forfait" };

  const actual = entryTotal(entry);
  const threshold = sector.rentability_target ?? 0;
  return { kind: "a_la_pose", check: { actual, threshold, met: actual >= threshold } };
}

export interface RentabiliteEntryRow {
  sectorCode: string | null;
  paymentType: PaymentType | null;
  objectif: number | null;
  realise: number | null;
  ecart: number | null;
  statusKind: "met" | "not_met" | "forfait" | "in_progress" | "none";
}

// Vue par tournée (une ligne = une entrée), partagée par la vue jour et le
// drill-down de la vue période de l'onglet Rentabilité. in_progress est
// tranché avant d'appeler entryProfitability, qui suppose une tournée déjà
// terminée (poses/enlèvements pas encore connus sinon).
export function rentabiliteEntryRow(entry: DailyEntry, sectorsById: Map<string, Sector>): RentabiliteEntryRow {
  const sector = resolveEntrySector(entry, sectorsById);
  const sectorCode = sector?.code ?? null;
  const paymentType = sector?.payment_type ?? null;

  if (entry.status === "in_progress") {
    return { sectorCode, paymentType, objectif: null, realise: null, ecart: null, statusKind: "in_progress" };
  }

  const status = entryProfitability(entry, sector);
  if (status.kind === "none") {
    return { sectorCode, paymentType, objectif: null, realise: null, ecart: null, statusKind: "none" };
  }
  if (status.kind === "forfait") {
    return { sectorCode, paymentType, objectif: null, realise: null, ecart: null, statusKind: "forfait" };
  }

  const { actual, threshold, met } = status.check;
  return {
    sectorCode,
    paymentType,
    objectif: threshold,
    realise: actual,
    ecart: actual - threshold,
    statusKind: met ? "met" : "not_met",
  };
}

export interface DriverRentabiliteSummary {
  driverId: string;
  fullName: string;
  joursTravailles: number;
  seuilsAtteints: number;
  seuilsTotal: number;
  tauxReussite: number | null;
}

// Agrégat par chauffeur sur une période : tous les chauffeurs actifs
// apparaissent (même précédent que aggregateByDriver dans stats.ts), même
// sans aucune activité sur la période.
export function aggregateRentabiliteByDriver(
  entries: DailyEntry[],
  drivers: { id: string; full_name: string }[],
  sectorsById: Map<string, Sector>,
): DriverRentabiliteSummary[] {
  const byDriver = new Map<string, { dates: Set<string>; met: number; total: number }>();
  for (const driver of drivers) {
    byDriver.set(driver.id, { dates: new Set(), met: 0, total: 0 });
  }

  for (const entry of entries) {
    const acc = byDriver.get(entry.driver_id);
    if (!acc) continue;
    acc.dates.add(entry.entry_date);

    if (entry.status !== "completed") continue;
    const sector = resolveEntrySector(entry, sectorsById);
    const status = entryProfitability(entry, sector);
    if (status.kind !== "a_la_pose") continue;
    acc.total += 1;
    if (status.check.met) acc.met += 1;
  }

  return drivers.map((driver) => {
    const acc = byDriver.get(driver.id)!;
    return {
      driverId: driver.id,
      fullName: driver.full_name,
      joursTravailles: acc.dates.size,
      seuilsAtteints: acc.met,
      seuilsTotal: acc.total,
      tauxReussite: acc.total > 0 ? (acc.met / acc.total) * 100 : null,
    };
  });
}

// KPI globaux (Accueil + en-tête de l'onglet Rentabilité) : uniquement les
// tournées à la pose terminées comptent, forfait et in_progress exclus des
// deux termes.
export function computeRentabiliteKpis(
  entries: DailyEntry[],
  sectorsById: Map<string, Sector>,
): { met: number; total: number } {
  let met = 0;
  let total = 0;
  for (const entry of entries) {
    if (entry.status !== "completed") continue;
    const status = entryProfitability(entry, resolveEntrySector(entry, sectorsById));
    if (status.kind !== "a_la_pose") continue;
    total += 1;
    if (status.check.met) met += 1;
  }
  return { met, total };
}
