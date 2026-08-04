"use client";

import { useState, useTransition } from "react";
import { startTournee } from "@/app/chauffeur/actions";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];
type Sector = Database["public"]["Tables"]["sectors"]["Row"];
type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];

export function TourneeStartScreen({
  firstName,
  sectors,
  defaultSectorId,
  defaultVehicleId,
  vehicles,
  onStarted,
}: {
  firstName: string;
  sectors: Sector[];
  defaultSectorId: string | null;
  defaultVehicleId: string | null;
  vehicles: Vehicle[];
  onStarted: (entry: DailyEntry) => void;
}) {
  const [sectorId, setSectorId] = useState(defaultSectorId ?? "");
  const defaultPlate = vehicles.find((v) => v.id === defaultVehicleId)?.plate ?? "";
  const [vehicleRegistration, setVehicleRegistration] = useState(defaultPlate);
  const [kmDepart, setKmDepart] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await startTournee(sectorId, Number(kmDepart), vehicleRegistration);
      if (result.error) setError(result.error);
      else if (result.entry) onStarted(result.entry);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col items-center gap-6 px-6 py-10 text-center"
    >
      <h1 className="text-2xl font-semibold text-foreground">Bonjour {firstName}</h1>

      <div className="flex w-full max-w-xs flex-col gap-4 text-left">
        <div className="flex flex-col gap-1">
          <label htmlFor="sector_id" className="text-sm text-foreground/70">
            Tournée
          </label>
          <select
            id="sector_id"
            required
            value={sectorId}
            onChange={(e) => setSectorId(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-foreground"
          >
            <option value="">Sélectionner...</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="vehicle_registration" className="text-sm text-foreground/70">
            Immatriculation du véhicule
          </label>
          <select
            id="vehicle_registration"
            required
            value={vehicleRegistration}
            onChange={(e) => setVehicleRegistration(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-foreground"
          >
            <option value="">Sélectionner...</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.plate}>
                {v.plate}
                {v.label ? ` — ${v.label}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="km_depart" className="text-sm text-foreground/70">
            Km au compteur
          </label>
          <input
            id="km_depart"
            type="number"
            inputMode="numeric"
            min={0}
            required
            value={kmDepart}
            onChange={(e) => setKmDepart(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground tabular-nums outline-none focus:border-foreground"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full max-w-xs rounded-full bg-km px-6 py-8 text-xl font-semibold text-accent-ink shadow-accent disabled:opacity-60"
      >
        {pending ? "Démarrage..." : "Démarrer la tournée"}
      </button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
