"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PERIOD_OPTIONS, type PeriodKey } from "@/lib/stats";

export function CarburantControls({
  period,
  customFrom,
  customTo,
  groupBy,
}: {
  period: PeriodKey;
  customFrom: string | null;
  customTo: string | null;
  groupBy: "chauffeur" | "vehicule";
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
      <div className="flex gap-2">
        {(
          [
            { key: "chauffeur", label: "Par chauffeur" },
            { key: "vehicule", label: "Par véhicule" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            onClick={() => updateParams({ groupBy: opt.key })}
            className={`rounded-md px-3 py-1.5 text-sm ${
              groupBy === opt.key
                ? "bg-foreground text-background"
                : "border border-border text-foreground/70"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => updateParams({ period: opt.key })}
            className={`rounded-md px-3 py-1.5 text-sm ${
              period === opt.key
                ? "bg-foreground text-background"
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
    </div>
  );
}
