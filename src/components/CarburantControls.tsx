"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type PeriodKey } from "@/lib/stats";
import { PeriodSelector } from "@/components/PeriodSelector";
import { EntitySelect } from "@/components/EntitySelect";

interface Driver {
  id: string;
  full_name: string;
}

interface Vehicle {
  id: string;
  plate: string;
}

export function CarburantControls({
  period,
  customFrom,
  customTo,
  groupBy,
  drivers,
  vehicles,
  selectedDriverId,
  selectedVehicleId,
}: {
  period: PeriodKey;
  customFrom: string | null;
  customTo: string | null;
  groupBy: "chauffeur" | "vehicule";
  drivers: Driver[];
  vehicles: Vehicle[];
  selectedDriverId: string;
  selectedVehicleId: string;
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

      <PeriodSelector
        period={period}
        customFrom={customFrom}
        customTo={customTo}
        updateParams={updateParams}
      />

      <div className="flex flex-wrap items-center gap-2">
        <EntitySelect
          label="Chauffeur"
          allLabel="Tous les chauffeurs"
          options={drivers.map((d) => ({ id: d.id, label: d.full_name }))}
          value={selectedDriverId}
          onChange={(id) => updateParams({ driver: id })}
        />
        <EntitySelect
          label="Véhicule"
          allLabel="Tous les véhicules"
          options={vehicles.map((v) => ({ id: v.id, label: v.plate }))}
          value={selectedVehicleId}
          onChange={(id) => updateParams({ vehicle: id })}
        />
      </div>
    </div>
  );
}
