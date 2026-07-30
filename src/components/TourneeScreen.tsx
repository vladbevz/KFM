"use client";

import { useState } from "react";
import Link from "next/link";
import { TourneeStartScreen } from "@/components/TourneeStartScreen";
import { TourneeInProgressScreen } from "@/components/TourneeInProgressScreen";
import { TourneeEndForm } from "@/components/TourneeEndForm";
import { EntryCard } from "@/components/EntryCard";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];
type Sector = Database["public"]["Tables"]["sectors"]["Row"];

export function TourneeScreen({
  firstName,
  inProgressEntry,
  completedToday,
  sectors,
  defaultSectorId,
}: {
  firstName: string;
  inProgressEntry: DailyEntry | null;
  completedToday: DailyEntry[];
  sectors: Sector[];
  defaultSectorId: string | null;
}) {
  const [activeEntry, setActiveEntry] = useState(inProgressEntry);
  const [showEndForm, setShowEndForm] = useState(false);
  const [todaysEntries, setTodaysEntries] = useState(completedToday);

  // Écrans 2 et 3 : un seul bouton / un seul formulaire, rien d'autre — pas
  // de titre, pas de liens secondaires (usage terrain, pas le dashboard).
  if (activeEntry && showEndForm) {
    return (
      <div className="mx-auto max-w-lg">
        <TourneeEndForm
          entry={activeEntry}
          onCompleted={(entry) => {
            setTodaysEntries((prev) => [entry, ...prev]);
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
      <div className="flex flex-wrap justify-center gap-2">
        <Link
          href="/chauffeur/planning"
          className="whitespace-nowrap rounded-md border border-border px-3 py-1.5 text-sm text-foreground/70"
        >
          Mon planning
        </Link>
        <Link
          href="/chauffeur/carburant"
          className="whitespace-nowrap rounded-md border border-border px-3 py-1.5 text-sm text-foreground/70"
        >
          Carburant
        </Link>
        <Link
          href="/chauffeur/panne"
          className="whitespace-nowrap rounded-md border border-red-900/50 px-3 py-1.5 text-sm text-red-400"
        >
          Signaler une panne
        </Link>
      </div>

      <TourneeStartScreen
        firstName={firstName}
        sectors={sectors}
        defaultSectorId={defaultSectorId}
        onStarted={setActiveEntry}
      />

      {todaysEntries.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground/80">
            Tournées d&apos;aujourd&apos;hui
          </h2>
          {todaysEntries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} sectors={sectors} />
          ))}
        </div>
      )}
    </div>
  );
}
