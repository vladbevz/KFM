"use client";

import { PERIOD_OPTIONS, type PeriodKey } from "@/lib/stats";

// Sélecteur de période (boutons + plage personnalisée), factorisé depuis
// Statistiques et Carburant qui en avaient chacun une copie identique.
export function PeriodSelector({
  period,
  customFrom,
  customTo,
  updateParams,
}: {
  period: PeriodKey;
  customFrom: string | null;
  customTo: string | null;
  updateParams: (updates: Record<string, string | null>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => updateParams({ period: opt.key })}
            className={`rounded-full px-3 py-1.5 text-sm ${
              period === opt.key
                ? "bg-foreground text-background"
                : "border border-border bg-surface text-foreground-muted"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {period === "custom" && (
        <div className="flex items-center gap-2">
          <label className="flex flex-col gap-1 text-sm text-foreground/70">
            Du
            <input
              type="date"
              defaultValue={customFrom ?? ""}
              onChange={(e) => updateParams({ from: e.target.value })}
              className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-foreground/70">
            Au
            <input
              type="date"
              defaultValue={customTo ?? ""}
              onChange={(e) => updateParams({ to: e.target.value })}
              className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
            />
          </label>
        </div>
      )}
    </div>
  );
}
