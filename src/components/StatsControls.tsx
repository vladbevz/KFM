"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { METRIC_OPTIONS, type Metric, type PeriodKey } from "@/lib/stats";
import { PeriodSelector } from "@/components/PeriodSelector";
import { EntitySelect } from "@/components/EntitySelect";

interface Driver {
  id: string;
  full_name: string;
}

export function StatsControls({
  period,
  customFrom,
  customTo,
  metric,
  view,
  drivers,
  selectedDriverId,
  size = "default",
}: {
  period: PeriodKey;
  customFrom: string | null;
  customTo: string | null;
  metric?: Metric;
  view?: "graphique" | "tableau";
  drivers?: Driver[];
  selectedDriverId?: string;
  // "lg" réservé au côté chauffeur ; les pages patron ne passent pas cette
  // prop et gardent le rendu "default" inchangé.
  size?: "default" | "lg";
}) {
  const lg = size === "lg";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3">
      {view && (
        <div className="flex gap-2">
          {(["graphique", "tableau"] as const).map((v) => (
            <button
              key={v}
              onClick={() => updateParams({ view: v })}
              className={`rounded-md px-3 py-1.5 text-sm capitalize ${
                view === v
                  ? "bg-foreground text-background"
                  : "border border-border text-foreground/70"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      <PeriodSelector
        period={period}
        customFrom={customFrom}
        customTo={customTo}
        updateParams={updateParams}
        size={size}
      />

      {drivers && (
        <EntitySelect
          label="Chauffeur"
          allLabel="Tous les chauffeurs (cumulé)"
          options={drivers.map((d) => ({ id: d.id, label: d.full_name }))}
          value={selectedDriverId ?? "all"}
          onChange={(id) => updateParams({ driver: id })}
        />
      )}

      {metric && (
        <div className="flex gap-2">
          {METRIC_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => updateParams({ metric: opt.key })}
              className={`rounded-md ${lg ? "px-4 py-3 text-base" : "px-3 py-1.5 text-sm"} ${
                metric === opt.key
                  ? "border text-foreground"
                  : "border border-border text-foreground/70"
              }`}
              style={
                metric === opt.key
                  ? { borderColor: opt.color, backgroundColor: `${opt.color}22` }
                  : undefined
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
