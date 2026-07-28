"use client";

import { useFormState, useFormStatus } from "react-dom";
import { addFuelLog, type FuelLogFormState } from "@/app/chauffeur/carburant/actions";
import type { Database } from "@/types/database";

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];

const initialState: FuelLogFormState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-km px-4 py-2 font-medium text-black disabled:opacity-60"
    >
      {pending ? "Enregistrement..." : "Ajouter le plein"}
    </button>
  );
}

export function FuelLogForm({ vehicles }: { vehicles: Vehicle[] }) {
  const [state, formAction] = useFormState(addFuelLog, initialState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="vehicle_id" className="text-sm text-foreground/70">
          Véhicule
        </label>
        <select
          id="vehicle_id"
          name="vehicle_id"
          required
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-km"
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
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground tabular-nums outline-none focus:border-km"
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
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground tabular-nums outline-none focus:border-km"
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
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-km"
        />
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
