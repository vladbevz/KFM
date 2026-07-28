import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];
type Sector = Database["public"]["Tables"]["sectors"]["Row"];

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
  | { kind: "qty_day"; day: ThresholdCheck };

type EntryPoses = Pick<
  DailyEntry,
  "matin_poses_livraison" | "apres_midi_poses_livraison"
>;

// Le modèle du jour est déterminé par un seul secteur "canonique" (matin en
// priorité, sinon après-midi) plutôt que de gérer indépendamment deux
// modèles potentiellement différents sur la même journée — en pratique une
// tournée porte un seul code/modèle de paiement pour la journée entière.
export function resolveDaySector(
  entry: Pick<DailyEntry, "matin_sector_id" | "apres_midi_sector_id">,
  sectorsById: Map<string, Sector>,
): Sector | null {
  const id = entry.matin_sector_id ?? entry.apres_midi_sector_id;
  return id ? (sectorsById.get(id) ?? null) : null;
}

export function dayProfitability(
  entry: EntryPoses,
  sector: Sector | null,
): ProfitabilityStatus {
  if (!sector) return { kind: "none" };

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
