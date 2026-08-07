"use client";

import { PERIOD_OPTIONS, type PeriodKey } from "@/lib/stats";

// Sélecteur de période (boutons + plage personnalisée), factorisé depuis
// Statistiques et Carburant qui en avaient chacun une copie identique.
export function PeriodSelector({
  period,
  customFrom,
  customTo,
  updateParams,
  size = "default",
}: {
  period: PeriodKey;
  customFrom: string | null;
  customTo: string | null;
  updateParams: (updates: Record<string, string | null>) => void;
  // "lg" réservé au côté chauffeur (cibles tactiles plus généreuses) ; les
  // pages patron (Rentabilité, Carburant, Coût de la flotte, Statistiques)
  // ne passent pas cette prop et gardent le rendu "default" inchangé.
  size?: "default" | "lg";
}) {
  const lg = size === "lg";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => updateParams({ period: opt.key })}
            className={`rounded-full ${lg ? "px-4 py-3 text-base" : "px-3 py-1.5 text-sm"} ${
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
          <label className={`flex flex-col gap-1 text-foreground/70 ${lg ? "text-base" : "text-sm"}`}>
            Du
            <input
              type="date"
              defaultValue={customFrom ?? ""}
              onChange={(e) => updateParams({ from: e.target.value })}
              className={`rounded-md border border-border bg-background text-foreground ${lg ? "px-3 py-3 text-base" : "px-2 py-1"}`}
            />
          </label>
          <label className={`flex flex-col gap-1 text-foreground/70 ${lg ? "text-base" : "text-sm"}`}>
            Au
            <input
              type="date"
              defaultValue={customTo ?? ""}
              onChange={(e) => updateParams({ to: e.target.value })}
              className={`rounded-md border border-border bg-background text-foreground ${lg ? "px-3 py-3 text-base" : "px-2 py-1"}`}
            />
          </label>
        </div>
      )}
    </div>
  );
}
