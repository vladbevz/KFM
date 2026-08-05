"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownAZ, ArrowUpAZ, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { ExpandableCard } from "@/components/ExpandableCard";
import type { DriverStatsRow } from "@/lib/stats";

type SortKey = Exclude<keyof DriverStatsRow, "driverId" | "joursTravailles">;

interface ColumnDef {
  key: SortKey;
  label: string;
  numeric: boolean;
  defaultDir: "asc" | "desc";
  decimals: number;
  suffix?: string;
}

// defaultDir détermine à la fois le sens du premier clic ET, combiné à la
// mise en avant positionnelle (première/dernière ligne), garantit que le
// vert tombe toujours sur la vraie meilleure valeur : "asc" pour les
// colonnes où une valeur basse est bonne (incidents, tournées non
// réussies), "desc" pour toutes les autres.
const COLUMNS: ColumnDef[] = [
  { key: "fullName", label: "Chauffeur", numeric: false, defaultDir: "asc", decimals: 0 },
  { key: "totalKm", label: "Km", numeric: true, defaultDir: "desc", decimals: 0 },
  { key: "avgKmPerDay", label: "Moy. km/jour", numeric: true, defaultDir: "desc", decimals: 1 },
  { key: "totalPoses", label: "Poses", numeric: true, defaultDir: "desc", decimals: 0 },
  { key: "avgPosesPerDay", label: "Moy. poses/jour", numeric: true, defaultDir: "desc", decimals: 1 },
  { key: "totalEnlevements", label: "Enlèvements", numeric: true, defaultDir: "desc", decimals: 0 },
  { key: "avgTotalPerDay", label: "Moy. poses+enl./jour", numeric: true, defaultDir: "desc", decimals: 1 },
  { key: "totalLiters", label: "Litres", numeric: true, defaultDir: "desc", decimals: 1, suffix: " L" },
  { key: "totalIncidents", label: "Avaries + Non livrées", numeric: true, defaultDir: "asc", decimals: 0 },
  { key: "seuilsAtteints", label: "Tournées réussies", numeric: true, defaultDir: "desc", decimals: 0 },
  { key: "seuilsNonAtteints", label: "Tournées non réussies", numeric: true, defaultDir: "asc", decimals: 0 },
  { key: "tauxReussite", label: "Rentabilité", numeric: true, defaultDir: "desc", decimals: 0, suffix: "%" },
];

const MOBILE_PRIMARY_KEYS: SortKey[] = ["totalKm", "tauxReussite", "avgTotalPerDay"];

function formatValue(row: DriverStatsRow, col: ColumnDef): string {
  if (col.key === "fullName") return row.fullName;
  const value = row[col.key] as number | null;
  if (value === null) return "—";
  return `${value.toFixed(col.decimals)}${col.suffix ?? ""}`;
}

function sortValue(row: DriverStatsRow, key: SortKey): number | string {
  if (key === "fullName") return row.fullName;
  return (row[key] as number | null) ?? -1;
}

type Trend = "up" | "down" | "flat" | "none";

function getTrend(row: DriverStatsRow, prevRow: DriverStatsRow | undefined, col: ColumnDef): Trend {
  if (col.key === "fullName") return "none";
  const curr = Number(((row[col.key] as number | null) ?? 0).toFixed(col.decimals));
  const prev = Number(((prevRow?.[col.key] as number | null) ?? 0).toFixed(col.decimals));
  if (curr > prev) return "up";
  if (curr < prev) return "down";
  return "flat";
}

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === "none") return <span className="text-foreground-muted">—</span>;
  if (trend === "up") return <ArrowUp className="h-4 w-4 text-enlevements" strokeWidth={1.8} />;
  if (trend === "down") return <ArrowDown className="h-4 w-4 text-destructive" strokeWidth={1.8} />;
  return <Minus className="h-4 w-4 text-foreground-muted" strokeWidth={1.8} />;
}

// Ligne agrégée flotte entière, recalculée depuis les totaux bruts (pas la
// moyenne des moyennes déjà affichées) — même principe que
// computeRentabiliteKpis : somme/somme, pas moyenne de pourcentages.
function summarizeRows(rows: DriverStatsRow[]): DriverStatsRow {
  const totals = rows.reduce(
    (acc, r) => ({
      totalKm: acc.totalKm + r.totalKm,
      totalPoses: acc.totalPoses + r.totalPoses,
      totalEnlevements: acc.totalEnlevements + r.totalEnlevements,
      totalLiters: acc.totalLiters + r.totalLiters,
      totalIncidents: acc.totalIncidents + r.totalIncidents,
      seuilsAtteints: acc.seuilsAtteints + r.seuilsAtteints,
      seuilsNonAtteints: acc.seuilsNonAtteints + r.seuilsNonAtteints,
      joursTravailles: acc.joursTravailles + r.joursTravailles,
    }),
    {
      totalKm: 0,
      totalPoses: 0,
      totalEnlevements: 0,
      totalLiters: 0,
      totalIncidents: 0,
      seuilsAtteints: 0,
      seuilsNonAtteints: 0,
      joursTravailles: 0,
    },
  );
  const seuilsTotal = totals.seuilsAtteints + totals.seuilsNonAtteints;

  return {
    driverId: "__summary__",
    fullName: "Total / moyenne flotte",
    totalKm: totals.totalKm,
    avgKmPerDay: totals.joursTravailles > 0 ? totals.totalKm / totals.joursTravailles : null,
    totalPoses: totals.totalPoses,
    avgPosesPerDay: totals.joursTravailles > 0 ? totals.totalPoses / totals.joursTravailles : null,
    totalEnlevements: totals.totalEnlevements,
    avgTotalPerDay:
      totals.joursTravailles > 0
        ? (totals.totalPoses + totals.totalEnlevements) / totals.joursTravailles
        : null,
    totalLiters: totals.totalLiters,
    totalIncidents: totals.totalIncidents,
    seuilsAtteints: totals.seuilsAtteints,
    seuilsNonAtteints: totals.seuilsNonAtteints,
    tauxReussite: seuilsTotal > 0 ? (totals.seuilsAtteints / seuilsTotal) * 100 : null,
    joursTravailles: totals.joursTravailles,
  };
}

export function ComparisonTable({
  data,
  prevData,
}: {
  data: DriverStatsRow[];
  prevData: DriverStatsRow[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [sortKey, setSortKey] = useState<SortKey>("totalKm");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const activeColumn = COLUMNS.find((c) => c.key === sortKey)!;
  const prevByDriverId = useMemo(() => new Map(prevData.map((r) => [r.driverId, r])), [prevData]);
  const summaryRow = useMemo(() => summarizeRows(data), [data]);
  const summaryPrevRow = useMemo(() => summarizeRows(prevData), [prevData]);

  const sorted = useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : av - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [data, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(COLUMNS.find((c) => c.key === key)!.defaultDir);
    }
  }

  function goToDriverDetail(driverId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "graphique");
    params.set("driver", driverId);
    router.push(`${pathname}?${params.toString()}`);
  }

  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-foreground/50">
        Aucune donnée pour cette période.
      </p>
    );
  }

  const highlightEnabled = sortKey !== "fullName" && sorted.length > 1;

  return (
    <>
      {/* Desktop/tablette : tableau inchangé dans son mécanisme, colonnes
          étendues + ligne de synthèse + tendance + mise en avant. */}
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
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
                    <span className="ml-1 text-foreground">{sortDir === "asc" ? "▲" : "▼"}</span>
                  )}
                </th>
              ))}
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-foreground/70">
                Tendance
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border bg-surface font-semibold">
              {COLUMNS.map((col) => (
                <td
                  key={col.key}
                  className={`whitespace-nowrap px-3 py-2 tabular-nums text-foreground ${col.numeric ? "text-right" : "text-left"}`}
                >
                  {formatValue(summaryRow, col)}
                </td>
              ))}
              <td className="px-3 py-2">
                <TrendIcon trend={getTrend(summaryRow, summaryPrevRow, activeColumn)} />
              </td>
            </tr>

            {sorted.map((row, index) => {
              const isBest = highlightEnabled && index === 0;
              const isWorst = highlightEnabled && index === sorted.length - 1;
              return (
                <tr
                  key={row.driverId}
                  onClick={() => goToDriverDetail(row.driverId)}
                  className={`cursor-pointer border-b border-border last:border-0 hover:bg-accent/50 ${
                    isBest ? "border-l-2 border-l-enlevements" : ""
                  } ${isWorst ? "border-l-2 border-l-destructive" : ""}`}
                >
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={`whitespace-nowrap px-3 py-2 tabular-nums text-foreground ${col.numeric ? "text-right" : "text-left font-medium"}`}
                    >
                      {formatValue(row, col)}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <TrendIcon trend={getTrend(row, prevByDriverId.get(row.driverId), activeColumn)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile : cartes + bouton "Trier par" (les en-têtes cliquables ne
          sont pas adaptés au tactile). */}
      <div className="flex flex-col gap-2 md:hidden">
        <div className="flex flex-col gap-1 rounded-2xl bg-accent p-4">
          <p className="text-sm font-semibold text-foreground">Total / moyenne flotte</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums text-foreground/80">
            {COLUMNS.filter((c) => c.numeric).map((col) => (
              <span key={col.key}>
                <span className="text-foreground-muted">{col.label} : </span>
                {formatValue(summaryRow, col)}
              </span>
            ))}
          </div>
        </div>

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
              <div className="absolute left-0 top-full z-20 mt-2 w-56 rounded-md border border-border bg-surface p-1 shadow-card">
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

        {sorted.map((row, index) => {
          const isBest = highlightEnabled && index === 0;
          const isWorst = highlightEnabled && index === sorted.length - 1;
          const otherColumns = COLUMNS.filter((c) => c.numeric && !MOBILE_PRIMARY_KEYS.includes(c.key));

          return (
            <div
              key={row.driverId}
              className={`rounded-2xl border shadow-card ${
                isBest ? "border-l-2 border-l-enlevements" : isWorst ? "border-l-2 border-l-destructive" : "border-border"
              }`}
            >
              <ExpandableCard
                header={<p className="font-medium text-foreground">{row.fullName}</p>}
                primary={
                  <div className="flex gap-4 text-sm tabular-nums text-foreground/70">
                    {MOBILE_PRIMARY_KEYS.map((key) => {
                      const col = COLUMNS.find((c) => c.key === key)!;
                      return (
                        <span key={key}>
                          <span className="text-foreground-muted">{col.label} : </span>
                          {formatValue(row, col)}
                        </span>
                      );
                    })}
                  </div>
                }
                detail={
                  <div className="flex flex-col gap-1.5 text-sm tabular-nums text-foreground/70">
                    {otherColumns.map((col) => (
                      <div key={col.key} className="flex items-center justify-between">
                        <span className="text-foreground-muted">{col.label}</span>
                        {formatValue(row, col)}
                      </div>
                    ))}
                    <div className="flex items-center justify-between">
                      <span className="text-foreground-muted">Tendance ({activeColumn.label})</span>
                      <TrendIcon trend={getTrend(row, prevByDriverId.get(row.driverId), activeColumn)} />
                    </div>
                    <button
                      type="button"
                      onClick={() => goToDriverDetail(row.driverId)}
                      className="mt-1 text-left text-sm font-medium text-foreground underline"
                    >
                      Voir le détail graphique →
                    </button>
                  </div>
                }
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
