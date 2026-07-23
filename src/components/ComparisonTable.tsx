"use client";

import { useMemo, useState } from "react";
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

  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-foreground/50">
        Aucune donnée pour cette période.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
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
                  <span className="ml-1 text-km">
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
  );
}
