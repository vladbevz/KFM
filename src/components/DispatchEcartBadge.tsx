"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function formatSigned(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

// Signal de transparence, pas une pénalité : affiche l'écart entre le total
// annoncé par le dispatch au départ et le détail réellement saisi à la
// clôture. Clic/tap pour révéler la valeur exacte (fonctionne aussi bien au
// clavier/souris qu'au doigt, contrairement à un simple `title` qui ne
// répond pas au tap sur mobile).
export function DispatchEcartBadge({
  ecart,
  label = "Écart déclaré",
  detailLabel = "Écart avec le dispatch",
}: {
  ecart: number;
  // Libellés distincts quand livraisons et enlèvements sont affichés comme
  // deux badges séparés (migration 021) plutôt qu'un seul écart combiné.
  label?: string;
  detailLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="inline-flex">
        <Badge variant="warning" className="cursor-pointer gap-1">
          <TriangleAlert className="h-3 w-3" strokeWidth={1.8} />
          {label}
        </Badge>
      </button>

      {open && (
        <>
          <button
            aria-label="Fermer"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute left-0 top-full z-20 mt-1.5 whitespace-nowrap rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground shadow-card">
            {detailLabel} : {formatSigned(ecart)}
          </div>
        </>
      )}
    </span>
  );
}
