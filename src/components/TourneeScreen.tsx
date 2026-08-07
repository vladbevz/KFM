"use client";

import { useState } from "react";
import Link from "next/link";
import { Fuel, AlertTriangle } from "lucide-react";
import { TourneeStartScreen } from "@/components/TourneeStartScreen";
import { TourneeInProgressScreen } from "@/components/TourneeInProgressScreen";
import { TourneeEndForm } from "@/components/TourneeEndForm";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];
type Sector = Database["public"]["Tables"]["sectors"]["Row"];
type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];

export function TourneeScreen({
  firstName,
  inProgressEntry,
  sectors,
  defaultSectorId,
  defaultVehicleId,
  vehicles,
}: {
  firstName: string;
  inProgressEntry: DailyEntry | null;
  sectors: Sector[];
  defaultSectorId: string | null;
  defaultVehicleId: string | null;
  vehicles: Vehicle[];
}) {
  const [activeEntry, setActiveEntry] = useState(inProgressEntry);
  const [showEndForm, setShowEndForm] = useState(false);

  // Écrans 2 et 3 : un seul bouton / un seul formulaire, rien d'autre — pas
  // de titre, pas de liens secondaires (usage terrain, pas le dashboard).
  if (activeEntry && showEndForm) {
    return (
      <div className="mx-auto max-w-lg">
        <TourneeEndForm
          entry={activeEntry}
          onCompleted={() => {
            setActiveEntry(null);
            setShowEndForm(false);
          }}
        />
      </div>
    );
  }

  if (activeEntry) {
    return (
      <TourneeInProgressScreen
        startedAt={activeEntry.started_at ?? new Date().toISOString()}
        onTerminer={() => setShowEndForm(true)}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div className="flex justify-center gap-8">
        <Link href="/chauffeur/carburant" className="flex flex-col items-center gap-2">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface shadow-card">
            <Fuel className="h-7 w-7 text-foreground" strokeWidth={1.8} />
          </span>
          <span className="text-sm text-foreground-muted">Carburant</span>
        </Link>
        <Link href="/chauffeur/panne" className="flex flex-col items-center gap-2">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface shadow-card">
            <AlertTriangle className="h-7 w-7 text-destructive" strokeWidth={1.8} />
          </span>
          <span className="text-sm text-destructive">Signaler une panne</span>
        </Link>
      </div>

      <TourneeStartScreen
        firstName={firstName}
        sectors={sectors}
        defaultSectorId={defaultSectorId}
        defaultVehicleId={defaultVehicleId}
        vehicles={vehicles}
        onStarted={setActiveEntry}
      />
    </div>
  );
}
