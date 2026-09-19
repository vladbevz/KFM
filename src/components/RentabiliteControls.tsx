"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PeriodSelector } from "@/components/PeriodSelector";
import { RentabiliteDateControl } from "@/components/RentabiliteDateControl";
import type { PeriodKey } from "@/lib/stats";
import type { ReactNode } from "react";

// Les pastilles de période restent toujours visibles ; les flèches
// Veille/Lendemain n'apparaissent qu'en plus, à côté, en mode "Aujourd'hui"
// (décision explicite : pas d'impasse de navigation pour revenir en vue
// jour depuis une vue période).
export function RentabiliteControls({
  period,
  date,
  customFrom,
  customTo,
  view,
  actions,
}: {
  period: PeriodKey;
  date: string;
  customFrom: string | null;
  customTo: string | null;
  view: "financier" | "operationnel";
  // Bouton d'export, différent selon la vue active — composé par la page.
  actions: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    // Revenir sur "Aujourd'hui" doit recentrer sur la vraie date du jour,
    // pas rester bloqué sur un jour précédemment consulté via les flèches.
    if (updates.period === "today") params.delete("date");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2">
            {(["financier", "operationnel"] as const).map((v) => (
              <button
                key={v}
                onClick={() => updateParams({ view: v })}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  view === v ? "bg-foreground text-background" : "border border-border text-foreground/70"
                }`}
              >
                {v === "financier" ? "Financier" : "Opérationnel"}
              </button>
            ))}
          </div>
          <PeriodSelector period={period} customFrom={customFrom} customTo={customTo} updateParams={updateParams} />
        </div>
        {actions}
      </div>
      {view === "operationnel" && period === "today" && <RentabiliteDateControl date={date} />}
    </div>
  );
}
