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

// Toutes les dates ISO entre from et to (inclus), en UTC — même précaution
// qu'ailleurs dans ce module (passer par l'heure locale ferait perdre/gagner
// un jour selon le fuseau). Partagée par la création manuelle de congé côté
// patron (saveScheduleEntry) et l'approbation d'une demande de congé.
export function datesInRange(from: string, to: string): string[] {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const cursor = new Date(Date.UTC(fy, fm - 1, fd));
  const end = new Date(Date.UTC(ty, tm - 1, td));
  const dates: string[] = [];
  while (cursor.getTime() <= end.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}
