"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToExcel, exportToPdf, type ExportColumn, type ExportRow } from "@/lib/export";

export function ExportButton({
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
          <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-md border border-border bg-surface p-1 shadow-card">
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
              Excel (.xlsx)
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
              PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
