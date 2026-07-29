"use client";

import { useState, useTransition } from "react";
import { startTournee } from "@/app/chauffeur/actions";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

export function TourneeStartScreen({
  firstName,
  onStarted,
}: {
  firstName: string;
  onStarted: (entry: DailyEntry) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await startTournee();
      if (result.error) setError(result.error);
      else if (result.entry) onStarted(result.entry);
    });
  }

  return (
    <div className="flex flex-col items-center gap-6 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Bonjour {firstName}</h1>
      <button
        onClick={handleClick}
        disabled={pending}
        className="w-full max-w-xs rounded-xl bg-km px-6 py-8 text-xl font-semibold text-black disabled:opacity-60"
      >
        {pending ? "Démarrage..." : "Démarrer la tournée"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
