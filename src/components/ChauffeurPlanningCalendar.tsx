import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysISO, mondayOf } from "@/lib/schedule";

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

function shiftMonth(monthISO: string, delta: number): string {
  const [y, m] = monthISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(monthISO: string): string {
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
    new Date(`${monthISO}-01T00:00:00`),
  );
}

// Calendrier mensuel simplifié, lecture seule (pas d'édition libre comme
// côté patron, cf. demande explicite) : mes congés approuvés dans ma propre
// couleur, les jours "indisponibles" chez un autre chauffeur en gris sans
// aucune identité (la page appelante ne reçoit déjà que des dates anonymes
// via la fonction security definer conge_dates_other_drivers).
export function ChauffeurPlanningCalendar({
  month,
  todayISO,
  ownCongeDates,
  otherCongeDates,
}: {
  month: string;
  todayISO: string;
  ownCongeDates: string[];
  otherCongeDates: string[];
}) {
  const ownSet = new Set(ownCongeDates);
  const otherSet = new Set(otherCongeDates);

  const firstOfMonth = `${month}-01`;
  const gridStart = mondayOf(firstOfMonth);

  const cells: string[] = [];
  let cursor = gridStart;
  // 6 semaines couvrent toujours un mois complet démarré n'importe quel jour.
  for (let i = 0; i < 42; i++) {
    cells.push(cursor);
    cursor = addDaysISO(cursor, 1);
  }
  // N'affiche pas la dernière semaine si elle ne contient aucun jour du mois
  // (mois qui tient sur 5 semaines) — évite une ligne vide.
  while (cells.length > 35 && cells.slice(-7).every((d) => d.slice(0, 7) !== month)) {
    cells.splice(-7, 7);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface shadow-card p-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/chauffeur/planning?month=${shiftMonth(month, -1)}`}
          className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-muted hover:bg-accent"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
        </Link>
        <p className="text-sm font-semibold capitalize text-foreground">{monthLabel(month)}</p>
        <Link
          href={`/chauffeur/planning?month=${shiftMonth(month, 1)}`}
          className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-muted hover:bg-accent"
          aria-label="Mois suivant"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-foreground-muted">
        {WEEKDAY_LABELS.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date) => {
          const inMonth = date.slice(0, 7) === month;
          const day = Number(date.slice(8, 10));
          const isToday = date === todayISO;
          const isOwnConge = ownSet.has(date);
          const isOtherConge = otherSet.has(date);

          // `foreground` est défini comme var(--foreground) brut (sans le
          // placeholder <alpha-value>) : Tailwind ne peut pas générer de
          // variante d'opacité dessus (bg-foreground/70 ne produit aucune
          // règle CSS, texte blanc invisible sur fond transparent). Couleurs
          // pleines uniquement ici.
          let cellClass = "text-foreground";
          let bgClass = "";
          if (!inMonth) {
            cellClass = "text-foreground-muted";
          } else if (isOwnConge) {
            bgClass = "bg-enlevements text-white";
          } else if (isOtherConge) {
            bgClass = "bg-foreground-muted text-white";
          } else if (isToday) {
            bgClass = "border border-foreground text-foreground";
          }

          return (
            <div
              key={date}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md text-xs tabular-nums ${bgClass} ${!bgClass ? cellClass : ""}`}
            >
              <span>{day}</span>
              {inMonth && isOwnConge && <span className="text-[9px] leading-none">Congé</span>}
              {inMonth && isOtherConge && !isOwnConge && (
                <span className="text-[9px] leading-none">Indispo.</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-foreground-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-enlevements" /> Mon congé
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-foreground-muted" /> Indisponible (autre chauffeur)
        </span>
      </div>
    </div>
  );
}
