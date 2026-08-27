"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToExcel } from "@/lib/export";
import { exportGeodisNegotiationPdf } from "@/lib/geodis-pdf";
import { GEODIS_EXPORT_COLUMNS, buildGeodisExportRows, type GeodisEntryRow } from "@/lib/geodis";

// Deux formats différents par conception : l'Excel reste la liste
// chronologique complète (pratique pour trier/filtrer soi-même), le PDF est
// le document de négociation structuré par tournée (contrat rappelé, plage
// reçue, détail jour par jour) — pas la même mise en page, pas la même
// fonction d'export (cf. lib/geodis-pdf.ts).
export function GeodisExportButton({
  rows,
  filename,
  periodLabel,
}: {
  rows: GeodisEntryRow[];
  filename: string;
  periodLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Download className="mr-1.5 h-4 w-4" strokeWidth={1.8} />
        {pending ? "Génération..." : "Exporter"}
      </Button>

      {open && (
        <>
          <button
            aria-label="Fermer le menu d'export"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-md border border-border bg-surface p-1 shadow-card">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                startTransition(async () => {
                  await exportToExcel({
                    columns: GEODIS_EXPORT_COLUMNS,
                    rows: buildGeodisExportRows(rows),
                    filename: `${filename}.xlsx`,
                  });
                });
              }}
              className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-accent disabled:opacity-60"
            >
              Excel (.xlsx)
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                startTransition(async () => {
                  await exportGeodisNegotiationPdf({ rows, periodLabel, filename: `${filename}.pdf` });
                });
              }}
              className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-accent disabled:opacity-60"
            >
              PDF (négociation)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
