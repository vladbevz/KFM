"use client";

import { useState, useTransition } from "react";
import { startTournee } from "@/app/chauffeur/actions";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];
type Sector = Database["public"]["Tables"]["sectors"]["Row"];

export function TourneeStartScreen({
  firstName,
  sectors,
  defaultSectorId,
  onStarted,
}: {
  firstName: string;
  sectors: Sector[];
  defaultSectorId: string | null;
  onStarted: (entry: DailyEntry) => void;
}) {
  const [sectorId, setSectorId] = useState(defaultSectorId ?? "");
  const [vehicleRegistration, setVehicleRegistration] = useState("");
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
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-km"
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
          <input
            id="vehicle_registration"
            type="text"
            required
            value={vehicleRegistration}
            onChange={(e) => setVehicleRegistration(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 uppercase text-foreground outline-none focus:border-km"
          />
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
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground tabular-nums outline-none focus:border-km"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full max-w-xs rounded-xl bg-km px-6 py-8 text-xl font-semibold text-black disabled:opacity-60"
      >
        {pending ? "Démarrage..." : "Démarrer la tournée"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
