import type { MonthlyObjectiveSummary } from "@/lib/rentabilite";

function formatSigned(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

// Carte "Mon objectif du mois" — uniquement des poses, jamais un montant en
// euros (la prime reste communiquée verbalement par le patron, cf. demande
// explicite). Le patron ne saisit rien pour cette carte : tout est recalculé
// depuis rentability_target + les tournées à la pose du mois en cours.
export function MonthlyObjectiveCard({ summary }: { summary: MonthlyObjectiveSummary }) {
  const ecartColor = summary.ecart > 0 ? "text-enlevements" : summary.ecart < 0 ? "text-destructive" : "text-foreground";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface shadow-card p-4">
      <p className="text-sm font-semibold text-foreground/80">
        Mon objectif du mois — {summary.monthLabel}
      </p>

      {summary.joursTravailles === 0 ? (
        <p className="text-sm text-foreground-muted">
          Aucune tournée à la pose enregistrée ce mois-ci pour le moment.
        </p>
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
            <p className="text-center text-xs text-foreground-muted">
              Tendance fin de mois (indicative, non garantie) : réalisé projeté{" "}
              <span className="font-medium">{summary.realiseProjete}</span> pour un objectif projeté{" "}
              <span className="font-medium">{summary.objectifProjete}</span> — écart{" "}
              <span className={ecartColor}>{formatSigned(summary.ecartProjete)}</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
