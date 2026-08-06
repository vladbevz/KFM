"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExportButton } from "@/components/ExportButton";
import type { ExportColumn, ExportRow } from "@/lib/export";
import type { VehicleCostSummary } from "@/lib/vehicles";

type SortKey = "plate" | "totalCost";

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "vehicule", label: "Véhicule" },
  { key: "cout", label: "Coût total réparations", numeric: true },
];

function formatCost(cost: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cost);
}

// Un seul indicateur (pas de paire meilleur/pire) : le véhicule qui a le
// plus coûté sur la période, seulement quand le tri porte sur le coût.
export function CoutsFlotteTable({ data, periodLabel }: { data: VehicleCostSummary[]; periodLabel: string }) {
  const [sortKey, setSortKey] = useState<SortKey>("totalCost");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const maxCost = useMemo(() => Math.max(0, ...data.map((d) => d.totalCost)), [data]);

  const sorted = useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
      const cmp = sortKey === "plate" ? a.plate.localeCompare(b.plate) : a.totalCost - b.totalCost;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [data, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-foreground-muted">
        Aucun véhicule pour le moment.
      </p>
    );
  }

  const exportRows: ExportRow[] = sorted.map((row) => ({
    vehicule: row.label ? `${row.plate} — ${row.label}` : row.plate,
    cout: formatCost(row.totalCost),
  }));

  return (
    <>
      <div className="flex justify-end">
        <ExportButton
          columns={EXPORT_COLUMNS}
          rows={exportRows}
          filename={`cout-flotte-${periodLabel.replace(/\s+/g, "-").toLowerCase()}`}
          title="KFM Suivi — Coût de la flotte"
          subtitle={`Période : ${periodLabel}`}
        />
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("plate")}>
                Véhicule
                {sortKey === "plate" && <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => toggleSort("totalCost")}
              >
                Coût total réparations
                {sortKey === "totalCost" && <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row) => {
              const isTopCost = sortKey === "totalCost" && row.totalCost === maxCost && maxCost > 0;
              return (
                <TableRow
                  key={row.vehicleId}
                  className={isTopCost ? "border-l-2 border-l-destructive" : ""}
                >
                  <TableCell className="font-medium">
                    <Link
                      href={`/patron/vehicules/${row.vehicleId}`}
                      className="inline-flex items-center gap-2 hover:underline"
                    >
                      {row.plate}
                      {row.label && <span className="text-foreground/50"> — {row.label}</span>}
                      {row.retired && <Badge variant="secondary">Retiré</Badge>}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCost(row.totalCost)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 md:hidden">
        {sorted.map((row) => {
          const isTopCost = sortKey === "totalCost" && row.totalCost === maxCost && maxCost > 0;
          return (
            <Link
              key={row.vehicleId}
              href={`/patron/vehicules/${row.vehicleId}`}
              className={`flex items-center justify-between gap-2 rounded-2xl border bg-surface shadow-card p-4 ${
                isTopCost ? "border-l-2 border-l-destructive" : "border-border"
              }`}
            >
              <div>
                <p className="flex items-center gap-2 font-medium text-foreground">
                  {row.plate}
                  {row.retired && <Badge variant="secondary">Retiré</Badge>}
                </p>
                {row.label && <p className="text-sm text-foreground/60">{row.label}</p>}
              </div>
              <p className="font-semibold tabular-nums text-foreground">{formatCost(row.totalCost)}</p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
