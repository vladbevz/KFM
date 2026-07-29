import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];
export type Sector = Database["public"]["Tables"]["sectors"]["Row"];

export interface ThresholdCheck {
  actual: number;
  threshold: number;
  met: boolean;
}

export type ProfitabilityStatus =
  | { kind: "none" }
  | { kind: "forfait_day" }
  | { kind: "qty_am_forfait_pm"; matin: ThresholdCheck }
  | { kind: "qty_am_qty_pm"; matin: ThresholdCheck; apresMidi: ThresholdCheck }
  | { kind: "qty_day"; day: ThresholdCheck }
  // Nouveau flux (une ligne = une tournée) : un seul chiffre vs un seul
  // seuil, quel que soit le modèle de paiement du secteur.
  | { kind: "tournee"; check: ThresholdCheck };

type SectorRef = Pick<DailyEntry, "sector_id" | "matin_sector_id" | "apres_midi_sector_id">;

// Le secteur "canonique" d'une ligne : sector_id pour une tournée du
// nouveau flux, sinon repli sur matin_sector_id/apres_midi_sector_id pour
// une ligne historique (ancien modèle "une ligne = un jour").
export function resolveEntrySector(entry: SectorRef, sectorsById: Map<string, Sector>): Sector | null {
  const id = entry.sector_id ?? entry.matin_sector_id ?? entry.apres_midi_sector_id;
  return id ? (sectorsById.get(id) ?? null) : null;
}

// Seuil numérique applicable à une ligne donnée, ou null si le modèle est
// "forfait_day" (rien à chiffrer). Pour qty_am_qty_pm, le seuil dépend du
// tournee_type (matin/après-midi) ; sans tournee_type (journée complète ou
// ligne historique), on additionne les deux seuils du secteur.
export function entryThreshold(
  entry: Pick<DailyEntry, "tournee_type">,
  sector: Sector | null,
): number | null {
  if (!sector) return null;

  switch (sector.payment_type) {
    case "forfait_day":
      return null;
    case "qty_day":
      return sector.day_threshold ?? 0;
    case "qty_am_forfait_pm":
      return sector.morning_threshold ?? 0;
    case "qty_am_qty_pm":
      if (entry.tournee_type === "matin") return sector.morning_threshold ?? 0;
      if (entry.tournee_type === "apres_midi") return sector.afternoon_threshold ?? 0;
      return (sector.morning_threshold ?? 0) + (sector.afternoon_threshold ?? 0);
  }
}

type EntryPoses = Pick<
  DailyEntry,
  "tournee_type" | "poses_delivered" | "matin_poses_livraison" | "apres_midi_poses_livraison"
>;

export function entryProfitability(entry: EntryPoses, sector: Sector | null): ProfitabilityStatus {
  if (!sector) return { kind: "none" };

  // Nouveau flux : une ligne = une tournée, un seul chiffre (poses
  // livrées) comparé à un seul seuil.
  if (entry.tournee_type) {
    if (sector.payment_type === "forfait_day") return { kind: "forfait_day" };
    const threshold = entryThreshold(entry, sector) ?? 0;
    const actual = entry.poses_delivered ?? 0;
    return { kind: "tournee", check: { actual, threshold, met: actual >= threshold } };
  }

  // Ligne historique : matin + après-midi dans la même ligne.
  const matinActual = entry.matin_poses_livraison ?? 0;
  const apresMidiActual = entry.apres_midi_poses_livraison ?? 0;

  switch (sector.payment_type) {
    case "forfait_day":
      return { kind: "forfait_day" };

    case "qty_am_forfait_pm": {
      const threshold = sector.morning_threshold ?? 0;
      return {
        kind: "qty_am_forfait_pm",
        matin: { actual: matinActual, threshold, met: matinActual >= threshold },
      };
    }

    case "qty_am_qty_pm": {
      const morningThreshold = sector.morning_threshold ?? 0;
      const afternoonThreshold = sector.afternoon_threshold ?? 0;
      return {
        kind: "qty_am_qty_pm",
        matin: {
          actual: matinActual,
          threshold: morningThreshold,
          met: matinActual >= morningThreshold,
        },
        apresMidi: {
          actual: apresMidiActual,
          threshold: afternoonThreshold,
          met: apresMidiActual >= afternoonThreshold,
        },
      };
    }

    case "qty_day": {
      const threshold = sector.day_threshold ?? 0;
      const total = matinActual + apresMidiActual;
      return {
        kind: "qty_day",
        day: { actual: total, threshold, met: total >= threshold },
      };
    }
  }
}
