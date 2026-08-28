import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

// Une ligne "nouveau flux" (une tournée) a tournee_type renseigné ; une
// ligne historique (ancien modèle "une ligne = un jour") ne l'a pas et
// garde ses champs matin_*/apres_midi_*. Extracteurs purs par entrée, sans
// dépendance à Sector — vivent ici (plutôt que dans stats.ts ou
// rentabilite.ts) pour que ces deux modules puissent tous les deux les
// utiliser sans import circulaire.
export function entryKm(entry: DailyEntry): number {
  return Math.max(0, (entry.km_arrivee ?? 0) - (entry.km_depart ?? 0));
}

export interface PosesBreakdown {
  delivered: number;
  damaged: number;
  notDelivered: number;
}

export function entryPosesBreakdown(entry: DailyEntry): PosesBreakdown {
  if (entry.tournee_type) {
    return {
      delivered: entry.poses_delivered ?? 0,
      damaged: entry.poses_damaged ?? 0,
      notDelivered: entry.poses_not_delivered ?? 0,
    };
  }
  // Les lignes historiques ne suivaient qu'un total "livrées".
  return {
    delivered: (entry.matin_poses_livraison ?? 0) + (entry.apres_midi_poses_livraison ?? 0),
    damaged: 0,
    notDelivered: 0,
  };
}

export function entryPoses(entry: DailyEntry): number {
  const { delivered, damaged, notDelivered } = entryPosesBreakdown(entry);
  return delivered + damaged + notDelivered;
}

export function entryEnlevements(entry: DailyEntry): number {
  if (entry.tournee_type) {
    return entry.poses_enlevement ?? 0;
  }
  return (entry.matin_poses_enlevement ?? 0) + (entry.apres_midi_poses_enlevement ?? 0);
}

// Volume total du jour utilisé pour la rentabilité et les statistiques :
// toutes les poses (livrées + avec avarie + non livrées) plus les
// enlèvements.
export function entryTotal(entry: DailyEntry): number {
  return entryPoses(entry) + entryEnlevements(entry);
}

// Écart entre le total annoncé par le dispatch au démarrage
// (dispatch_declared_total) et le détail réellement saisi à la clôture —
// signal de transparence uniquement, jamais un blocage (cf. suppression du
// blocage strict : le dispatch peut légitimement ajouter une pose en cours
// de tournée). null si non applicable (tournée pas encore terminée, entrée
// historique sans total déclaré, ou aucun écart). Pas de colonne dédiée en
// base : toutes les données nécessaires sont déjà stockées sur l'entrée,
// recalculé à l'affichage comme les autres indicateurs dérivés
// (entryProfitability, rentabiliteEntryRow).
export function dispatchEcart(entry: DailyEntry): number | null {
  if (entry.status !== "completed" || entry.dispatch_declared_total === null) return null;
  const ecart = entryTotal(entry) - entry.dispatch_declared_total;
  return ecart === 0 ? null : ecart;
}
