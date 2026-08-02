"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import { ExpandableCard } from "@/components/ExpandableCard";
import type { DriverMetrics } from "@/lib/stats";

type SortKey = keyof Pick<
  DriverMetrics,
  "fullName" | "totalKm" | "totalPoses" | "totalEnlevements"
>;

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "fullName", label: "Chauffeur", numeric: false },
  { key: "totalKm", label: "Km", numeric: true },
  { key: "totalPoses", label: "Poses", numeric: true },
  { key: "totalEnlevements", label: "Enlèvements", numeric: true },
];

export function ComparisonTable({ data }: { data: DriverMetrics[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("totalKm");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp =
        typeof av === "string"
          ? av.localeCompare(bv as string)
          : (av as number) - (bv as number);
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

  useEffect(() => {
    if (!sortMenuOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSortMenuOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [sortMenuOpen]);

  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-foreground/50">
        Aucune donnée pour cette période.
      </p>
    );
  }

  const activeColumn = COLUMNS.find((c) => c.key === sortKey)!;

  return (
    <>
      {/* Desktop/tablette : tableau inchangé, tri par en-tête cliquable. */}
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`cursor-pointer select-none whitespace-nowrap px-3 py-2 font-medium text-foreground/70 hover:text-foreground ${
                    col.numeric ? "text-right" : "text-left"
                  }`}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1 text-foreground">
                      {sortDir === "asc" ? "▲" : "▼"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.driverId} className="border-b border-border last:border-0">
                <td className="px-3 py-2 text-foreground">{row.fullName}</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">
                  {row.totalKm}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">
                  {row.totalPoses}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">
                  {row.totalEnlevements}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile : cartes + bouton "Trier par" (les en-têtes cliquables ne
          sont pas adaptés au tactile). */}
      <div className="flex flex-col gap-2 md:hidden">
        <div className="relative">
          <button
            type="button"
            onClick={() => setSortMenuOpen((v) => !v)}
            aria-expanded={sortMenuOpen}
            className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground"
          >
            {sortDir === "asc" ? (
              <ArrowUpAZ className="h-4 w-4" strokeWidth={1.8} />
            ) : (
              <ArrowDownAZ className="h-4 w-4" strokeWidth={1.8} />
            )}
            Trier par : {activeColumn.label}
          </button>

          {sortMenuOpen && (
            <>
              <button
                aria-label="Fermer le menu de tri"
                onClick={() => setSortMenuOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div className="absolute left-0 top-full z-20 mt-2 w-52 rounded-md border border-border bg-surface p-1 shadow-card">
                {COLUMNS.map((col) => (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => {
                      toggleSort(col.key);
                      setSortMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                      sortKey === col.key ? "bg-km text-accent-ink" : "text-foreground hover:bg-accent"
                    }`}
                  >
                    {col.label}
                    {sortKey === col.key && (sortDir === "asc" ? "▲" : "▼")}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {sorted.map((row) => (
          <ExpandableCard
            key={row.driverId}
            header={<p className="font-medium text-foreground">{row.fullName}</p>}
            primary={
              <div className="flex gap-4 text-sm tabular-nums text-foreground/70">
                <span>
                  <span className="text-foreground-muted">Km : </span>
                  {row.totalKm}
                </span>
                <span>
                  <span className="text-foreground-muted">Poses : </span>
                  {row.totalPoses}
                </span>
              </div>
            }
            detail={
              <p className="text-sm tabular-nums text-foreground/70">
                Enlèvements : {row.totalEnlevements}
              </p>
            }
          />
        ))}
      </div>
    </>
  );
}
