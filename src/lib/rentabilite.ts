import type { Database } from "@/types/database";
import { entryTotal } from "@/lib/entries";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];
export type Sector = Database["public"]["Tables"]["sectors"]["Row"];

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
