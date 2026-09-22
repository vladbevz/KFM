import type { MonthlyObjectiveSummary } from "@/lib/rentabilite";

function formatSigned(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

function ForfaitNote({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <p className="text-center text-xs tabular-nums text-foreground-muted">
      + {count} forfait{count > 1 ? "s" : ""}
    </p>
  );
}

// Carte "Mon objectif du mois" — uniquement des poses, jamais un montant en
// euros (la prime reste communiquée verbalement par le patron, cf. demande
// explicite). Le patron ne saisit rien pour cette carte : tout est recalculé
// depuis rentability_target + les tournées à la pose du mois en cours. Le
// code du secteur est affiché en toutes lettres dans le titre : un chauffeur
// qui fait aussi une tournée forfait le même mois (ex. M55 le matin, A55
// forfait l'après-midi) doit savoir sans ambiguïté à quelle tournée
// l'objectif se rapporte — pour un chauffeur à tournée unique, ça ne change
// rien puisqu'il n'y a qu'un seul code possible.
export function MonthlyObjectiveCard({ summary }: { summary: MonthlyObjectiveSummary }) {
  const ecartColor = summary.ecart > 0 ? "text-enlevements" : summary.ecart < 0 ? "text-destructive" : "text-foreground";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface shadow-card p-4">
      <p className="text-sm font-semibold text-foreground/80">
        Mon objectif du mois{summary.sectorCode ? ` — ${summary.sectorCode}` : ""} — {summary.monthLabel}
      </p>

      {summary.joursTravailles === 0 ? (
        <>
          <p className="text-sm text-foreground-muted">
            Aucune tournée à la pose enregistrée ce mois-ci pour le moment.
          </p>
          <ForfaitNote count={summary.forfaitTourneesCount} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xl font-semibold tabular-nums text-foreground">{summary.objectifCumule}</p>
              <p className="text-xs text-foreground-muted">Objectif</p>
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums text-foreground">{summary.realiseCumule}</p>
              <p className="text-xs text-foreground-muted">Réalisé</p>
            </div>
            <div>
              <p className={`text-xl font-semibold tabular-nums ${ecartColor}`}>{formatSigned(summary.ecart)}</p>
              <p className="text-xs text-foreground-muted">Écart</p>
            </div>
          </div>

          {summary.ecartProjete !== null && (
            <p className="text-center text-xs tabular-nums text-foreground-muted">
              Tendance : {summary.realiseProjete} / {summary.objectifProjete} · écart{" "}
              <span className={ecartColor}>{formatSigned(summary.ecartProjete)}</span>
            </p>
          )}

          <ForfaitNote count={summary.forfaitTourneesCount} />
        </>
      )}
    </div>
  );
}
