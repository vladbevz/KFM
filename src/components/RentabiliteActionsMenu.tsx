"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { exportToExcel, exportToPdf, type ExportColumn, type ExportRow } from "@/lib/export";

// Regroupe les actions secondaires de Rentabilité (navigation vers
// Tournées/Geodis + export) derrière un seul déclencheur "⋯" — même pattern
// que AccountMenuButton/ExportButton (menu léger maison, pas de dépendance
// dropdown-menu supplémentaire). Évite d'aligner 3 boutons au look
// identique à côté des pastilles de période sur mobile.
export function RentabiliteActionsMenu({
  columns,
  rows,
  filename,
  title,
  subtitle,
}: {
  columns: ExportColumn[];
  rows: ExportRow[];
  filename: string;
  title: string;
  subtitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Plus d'actions"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground-muted hover:bg-accent"
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={1.8} />
      </button>

      {open && (
        <>
          <button
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-md border border-border bg-surface p-1 shadow-card">
            <Link
              href="/patron/secteurs"
              onClick={() => setOpen(false)}
              className="flex items-center rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
            >
              Gérer les tournées
            </Link>
            <Link
              href="/patron/rentabilite/geodis"
              onClick={() => setOpen(false)}
              className="flex items-center rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
            >
              Statistiques financières
            </Link>
            <div className="my-1 border-t border-border" />
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                startTransition(async () => {
                  await exportToExcel({ columns, rows, filename: `${filename}.xlsx` });
                });
              }}
              className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-accent disabled:opacity-60"
            >
              Exporter en Excel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                startTransition(async () => {
                  await exportToPdf({ title, subtitle, columns, rows, filename: `${filename}.pdf` });
                });
              }}
              className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-accent disabled:opacity-60"
            >
              Exporter en PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
