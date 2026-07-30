"use client";

import Link from "next/link";
import { Wrench, Fuel } from "lucide-react";

function formatStartedAt(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
}

export function TourneeInProgressScreen({
  startedAt,
  onTerminer,
}: {
  startedAt: string;
  onTerminer: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-8 px-6 py-16 text-center">
      <p className="text-lg text-foreground/70">
        En tournée depuis {formatStartedAt(startedAt)}
      </p>

      <div className="flex gap-4">
        <Link
          href="/chauffeur/panne"
          className="flex flex-col items-center gap-2 rounded-lg border border-border px-6 py-4 text-sm text-foreground/70"
        >
          <Wrench className="h-6 w-6" />
          Signaler une panne
        </Link>
        <Link
          href="/chauffeur/carburant"
          className="flex flex-col items-center gap-2 rounded-lg border border-border px-6 py-4 text-sm text-foreground/70"
        >
          <Fuel className="h-6 w-6" />
          Ajouter un plein
        </Link>
      </div>

      <button
        onClick={onTerminer}
        className="w-full max-w-xs rounded-xl bg-km px-6 py-8 text-xl font-semibold text-black"
      >
        Terminer la tournée
      </button>
    </div>
  );
}
