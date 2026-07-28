"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setVehicleStatus } from "@/app/patron/vehicules/actions";
import type { VehicleStatus } from "@/types/database";

const OPTIONS: { value: VehicleStatus; label: string }[] = [
  { value: "operational", label: "Opérationnel" },
  { value: "issue_running", label: "Panne signalée" },
  { value: "unavailable", label: "Indisponible" },
  { value: "in_repair", label: "En réparation" },
];

export function VehicleStatusControl({
  vehicleId,
  status,
}: {
  vehicleId: string;
  status: VehicleStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          size="sm"
          disabled={pending}
          variant={opt.value === status ? "default" : "outline"}
          onClick={() =>
            startTransition(async () => {
              await setVehicleStatus(vehicleId, opt.value);
            })
          }
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
