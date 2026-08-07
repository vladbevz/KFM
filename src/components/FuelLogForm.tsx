"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addFuelLog } from "@/app/chauffeur/carburant/actions";
import type { Database } from "@/types/database";

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];

export function FuelLogForm({
  vehicles,
  defaultVehicleId,
}: {
  vehicles: Vehicle[];
  defaultVehicleId?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await addFuelLog({ error: null }, formData);
      if (result.error) {
        setError(result.error);
      } else {
        toast.success("Plein enregistré !");
        router.push("/chauffeur");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface shadow-card p-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="vehicle_id" className="text-sm text-foreground/70">
          Véhicule
        </label>
        <select
          id="vehicle_id"
          name="vehicle_id"
          required
          defaultValue={defaultVehicleId ?? ""}
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-foreground"
        >
          <option value="">Sélectionner...</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.plate}
              {v.label ? ` — ${v.label}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="liters" className="text-sm text-foreground/70">
            Litres
          </label>
          <input
            id="liters"
            name="liters"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            required
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground tabular-nums outline-none focus:border-foreground"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="odometer" className="text-sm text-foreground/70">
            Kilométrage
          </label>
          <input
            id="odometer"
            name="odometer"
            type="number"
            min="0"
            inputMode="numeric"
            required
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground tabular-nums outline-none focus:border-foreground"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filled_at" className="text-sm text-foreground/70">
          Date
        </label>
        <input
          id="filled_at"
          name="filled_at"
          type="date"
          defaultValue={today}
          required
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-foreground"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-md bg-km px-4 py-2 font-medium text-accent-ink disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? "Enregistrement..." : "Ajouter le plein"}
      </button>
    </form>
  );
}
