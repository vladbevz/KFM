"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { METRIC_OPTIONS, PERIOD_OPTIONS, type Metric, type PeriodKey } from "@/lib/stats";

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
}: {
  period: PeriodKey;
  customFrom: string | null;
  customTo: string | null;
  metric?: Metric;
  view?: "graphique" | "tableau";
  drivers?: Driver[];
  selectedDriverId?: string;
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
                  ? "bg-km text-black"
                  : "border border-border text-foreground/70"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => updateParams({ period: opt.key })}
            className={`rounded-md px-3 py-1.5 text-sm ${
              period === opt.key
                ? "bg-surface border border-km text-foreground"
                : "border border-border text-foreground/70"
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

      {drivers && (
        <label className="flex flex-col gap-1 text-sm text-foreground/70">
          Chauffeur
          <select
            value={selectedDriverId ?? "all"}
            onChange={(e) => updateParams({ driver: e.target.value })}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-foreground"
          >
            <option value="all">Tous les chauffeurs (cumulé)</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}
              </option>
            ))}
          </select>
        </label>
      )}

      {metric && (
        <div className="flex gap-2">
          {METRIC_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => updateParams({ metric: opt.key })}
              className={`rounded-md px-3 py-1.5 text-sm ${
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
