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
  actions,
}: {
  period: PeriodKey;
  date: string;
  customFrom: string | null;
  customTo: string | null;
  // Menu "⋯" (Tournées/Geodis/Export) affiché à côté des pastilles de
  // période — regroupé ici plutôt que dans une rangée de boutons séparée,
  // pour éviter d'empiler plusieurs rangées de boutons au look identique.
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
      <div className="flex items-center justify-between gap-2">
        <PeriodSelector period={period} customFrom={customFrom} customTo={customTo} updateParams={updateParams} />
        {actions}
      </div>
      {period === "today" && <RentabiliteDateControl date={date} />}
    </div>
  );
}
