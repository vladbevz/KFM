import type { AssignmentType } from "@/types/database";

// Source unique pour libellés/couleurs des statuts de planning, réutilisée
// par le calendrier, le panneau d'aperçu du jour, le formulaire et le
// planificateur hebdomadaire — pour ne jamais désynchroniser ces 4 endroits.
export const TYPE_LABELS: Record<AssignmentType, string> = {
  tournee: "Tournée",
  conge: "Congé",
  absence: "Absence",
};

export const TYPE_COLORS: Record<AssignmentType, string> = {
  tournee: "#2A5FBF",
  conge: "#1B8A54",
  absence: "#C4342C",
};

// Utilitaires de date pour le planificateur hebdomadaire — entièrement en
// UTC (Date.UTC + setUTCDate/getUTCDay), même précaution qu'ailleurs dans
// l'app (RentabiliteDateControl, saveScheduleEntry) : passer par l'heure
// locale ferait perdre/gagner un jour selon le fuseau.
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function mondayOf(dateStr?: string): string {
  const base = dateStr ?? isoDate(new Date());
  const [y, m, d] = base.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay(); // 0 = dimanche .. 6 = samedi
  const diff = day === 0 ? -6 : 1 - day;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return isoDate(dt);
}

export function addDaysISO(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return isoDate(dt);
}
