"use client";

import { Fragment, useMemo, useState } from "react";
import { ArrowDownAZ, ArrowUpAZ, ChevronDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExpandableCard } from "@/components/ExpandableCard";
import { ExportButton } from "@/components/ExportButton";
import { slugifyFilename, type ExportColumn, type ExportRow } from "@/lib/export";
import { entryPosesBreakdown, entryEnlevements, entryKm, type DriverStatsRow } from "@/lib/stats";
import { PAYMENT_TYPE_LABELS, resolveEntrySector, type Sector } from "@/lib/rentabilite";
import { geodisEntryRow, formatEuros } from "@/lib/geodis";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

type SortKey = Exclude<keyof DriverStatsRow, "driverId" | "joursTravailles">;

interface ColumnDef {
  key: SortKey;
  label: string;
  defaultDir: "asc" | "desc";
}

// defaultDir détermine le sens du premier clic sur l'en-tête : "asc" pour
// les colonnes où une valeur basse est bonne (avaries, non livrées,
// tournées non réussies), "desc" pour toutes les autres.
const COLUMNS: ColumnDef[] = [
  { key: "fullName", label: "Chauffeur", defaultDir: "asc" },
  { key: "totalKm", label: "Km", defaultDir: "desc" },
  { key: "totalPoses", label: "Poses", defaultDir: "desc" },
  { key: "totalEnlevements", label: "Enlèvements", defaultDir: "desc" },
  { key: "totalLiters", label: "Litres", defaultDir: "desc" },
  { key: "totalDamaged", label: "Avaries", defaultDir: "asc" },
  { key: "totalNotDelivered", label: "Non livrées", defaultDir: "asc" },
  { key: "seuilsAtteints", label: "Tournées réussies", defaultDir: "desc" },
  { key: "seuilsNonAtteints", label: "Tournées non réussies", defaultDir: "asc" },
];

const MOBILE_PRIMARY_KEYS: SortKey[] = ["totalKm", "totalPoses", "totalEnlevements"];

function formatValue(row: DriverStatsRow, col: ColumnDef): string {
  if (col.key === "fullName") return row.fullName;
  const value = row[col.key] as number;
  return col.key === "totalLiters" ? `${value.toFixed(1)} L` : String(value);
}

function sortValue(row: DriverStatsRow, key: SortKey): number | string {
  if (key === "fullName") return row.fullName;
  return row[key] as number;
}

// Ligne agrégée flotte entière, recalculée depuis les totaux bruts (pas la
// moyenne des moyennes) — même principe que computeRentabiliteKpis.
function summarizeRows(rows: DriverStatsRow[]): DriverStatsRow {
  const totals = rows.reduce(
    (acc, r) => ({
      totalKm: acc.totalKm + r.totalKm,
      totalPoses: acc.totalPoses + r.totalPoses,
      totalEnlevements: acc.totalEnlevements + r.totalEnlevements,
      totalLiters: acc.totalLiters + r.totalLiters,
      totalDamaged: acc.totalDamaged + r.totalDamaged,
      totalNotDelivered: acc.totalNotDelivered + r.totalNotDelivered,
      seuilsAtteints: acc.seuilsAtteints + r.seuilsAtteints,
      seuilsNonAtteints: acc.seuilsNonAtteints + r.seuilsNonAtteints,
      joursTravailles: acc.joursTravailles + r.joursTravailles,
    }),
    {
      totalKm: 0,
      totalPoses: 0,
      totalEnlevements: 0,
      totalLiters: 0,
      totalDamaged: 0,
      totalNotDelivered: 0,
      seuilsAtteints: 0,
      seuilsNonAtteints: 0,
      joursTravailles: 0,
    },
  );

  return {
    driverId: "__summary__",
    fullName: "Total flotte",
    ...totals,
  };
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
    new Date(`${iso}T00:00:00`),
  );
}

// Détail d'une tournée précise (une ligne = une entrée), affiché au clic sur
// un chauffeur — chauffeur, tournée, livraisons/avaries/non livrées et
// enlèvements séparément, km, et revenu théorique/réel quand un tarif est
// figé pour cette tournée (cf. lib/geodis.ts, migration 021).
function TourneeDetailRow({
  entry,
  sectorsById,
  priceSnapshotByEntryId,
  forfaitSnapshotByEntryId,
  enlevementPriceSnapshotByEntryId,
}: {
  entry: DailyEntry;
  sectorsById: Map<string, Sector>;
  priceSnapshotByEntryId: Map<string, number>;
  forfaitSnapshotByEntryId: Map<string, number>;
  enlevementPriceSnapshotByEntryId: Map<string, number>;
}) {
  const sector = resolveEntrySector(entry, sectorsById);
  const poses = entryPosesBreakdown(entry);
  const geodis =
    entry.status === "completed"
      ? geodisEntryRow(
          entry,
          sectorsById,
          priceSnapshotByEntryId,
          forfaitSnapshotByEntryId,
          new Map(),
          enlevementPriceSnapshotByEntryId,
        )
      : null;

  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-background px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium tabular-nums text-foreground">
          {formatDate(entry.entry_date)} · {sector?.code ?? "—"}
          {sector && (
            <span className="ml-1.5 text-xs font-normal text-foreground-muted">
              {PAYMENT_TYPE_LABELS[sector.payment_type]}
            </span>
          )}
        </span>
        {geodis && (geodis.revenuReel !== null || geodis.revenuTheorique !== null) && (
          <span className="text-xs tabular-nums text-foreground-muted">
            Théorique : {geodis.revenuTheorique !== null ? formatEuros(geodis.revenuTheorique) : "—"} · Réel :{" "}
            {geodis.revenuReel !== null ? formatEuros(geodis.revenuReel) : "—"}
          </span>
        )}
      </div>
      <p className="tabular-nums text-foreground-muted">
        Livrées : {poses.delivered} · Avaries : {poses.damaged} · Non livrées : {poses.notDelivered} · Enlèvements :{" "}
        {entryEnlevements(entry)} · {entryKm(entry)} km
      </p>
    </div>
  );
}

export function ComparisonTable({
  data,
  periodLabel,
  entries,
  sectorsById,
  priceSnapshotByEntryId,
  forfaitSnapshotByEntryId,
  enlevementPriceSnapshotByEntryId,
}: {
  data: DriverStatsRow[];
  periodLabel: string;
  entries: DailyEntry[];
  sectorsById: Map<string, Sector>;
  priceSnapshotByEntryId: Map<string, number>;
  forfaitSnapshotByEntryId: Map<string, number>;
  enlevementPriceSnapshotByEntryId: Map<string, number>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("totalKm");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null);

  const activeColumn = COLUMNS.find((c) => c.key === sortKey)!;
  const summaryRow = useMemo(() => summarizeRows(data), [data]);

  const entriesByDriver = useMemo(() => {
    const map = new Map<string, DailyEntry[]>();
    for (const entry of entries) {
      if (entry.status !== "completed") continue;
      const list = map.get(entry.driver_id) ?? [];
      list.push(entry);
      map.set(entry.driver_id, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.entry_date.localeCompare(b.entry_date));
    return map;
  }, [entries]);

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

  function toggleExpand(driverId: string) {
    setExpandedDriverId((current) => (current === driverId ? null : driverId));
  }

  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-foreground/50">
        Aucune donnée pour cette période.
      </p>
    );
  }

  const highlightEnabled = sortKey !== "fullName" && sorted.length > 1;

  // Export : respecte le tri courant, synthèse flotte incluse en dernière
  // ligne (comme à l'écran).
  const exportColumns: ExportColumn[] = COLUMNS.map((c) => ({
    key: c.key,
    label: c.label,
    numeric: c.key !== "fullName",
  }));
  const toExportRow = (row: DriverStatsRow): ExportRow =>
    Object.fromEntries(COLUMNS.map((c) => [c.key, formatValue(row, c)]));
  const exportRows: ExportRow[] = [...sorted.map(toExportRow), toExportRow(summaryRow)];

  function detailFor(driverId: string) {
    const driverEntries = entriesByDriver.get(driverId) ?? [];
    if (driverEntries.length === 0) {
      return <p className="py-2 text-sm text-foreground-muted">Aucune tournée sur cette période.</p>;
    }
    return (
      <div className="flex flex-col gap-2">
        {driverEntries.map((entry) => (
          <TourneeDetailRow
            key={entry.id}
            entry={entry}
            sectorsById={sectorsById}
            priceSnapshotByEntryId={priceSnapshotByEntryId}
            forfaitSnapshotByEntryId={forfaitSnapshotByEntryId}
            enlevementPriceSnapshotByEntryId={enlevementPriceSnapshotByEntryId}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end">
        <ExportButton
          columns={exportColumns}
          rows={exportRows}
          filename={`statistiques-chauffeurs-${slugifyFilename(periodLabel)}`}
          title="KFM Suivi — Statistiques des chauffeurs"
          subtitle={`Période : ${periodLabel}`}
        />
      </div>

      {/* Desktop/tablette : cliquer une ligne déplie le détail tournée par
          tournée (livraisons/avaries/non livrées/enlèvements/km/revenu),
          plutôt que de rediriger vers le graphique. Synthèse flotte en
          dernière ligne. */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((col) => (
                <TableHead
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`cursor-pointer select-none hover:text-foreground ${col.key !== "fullName" ? "text-right" : ""}`}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1 text-foreground">{sortDir === "asc" ? "▲" : "▼"}</span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row, index) => {
              const isBest = highlightEnabled && index === 0;
              const isWorst = highlightEnabled && index === sorted.length - 1;
              const isOpen = expandedDriverId === row.driverId;
              return (
                <Fragment key={row.driverId}>
                  <TableRow
                    onClick={() => toggleExpand(row.driverId)}
                    className={`cursor-pointer ${isBest ? "border-l-2 border-l-enlevements" : ""} ${isWorst ? "border-l-2 border-l-destructive" : ""}`}
                  >
                    {COLUMNS.map((col) => (
                      <TableCell
                        key={col.key}
                        className={`whitespace-nowrap tabular-nums ${col.key !== "fullName" ? "text-right" : "font-medium"}`}
                      >
                        {col.key === "fullName" && (
                          <ChevronDown
                            className={`mr-1.5 inline h-3.5 w-3.5 shrink-0 text-foreground-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                            strokeWidth={1.8}
                          />
                        )}
                        {formatValue(row, col)}
                      </TableCell>
                    ))}
                  </TableRow>
                  {isOpen && (
                    <TableRow>
                      <TableCell colSpan={COLUMNS.length} className="bg-background p-0">
                        <div className="p-3">{detailFor(row.driverId)}</div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}

            <TableRow className="bg-surface font-semibold">
              {COLUMNS.map((col) => (
                <TableCell
                  key={col.key}
                  className={`whitespace-nowrap tabular-nums ${col.key !== "fullName" ? "text-right" : ""}`}
                >
                  {formatValue(summaryRow, col)}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Mobile : cartes + bouton "Trier par" (les en-têtes cliquables ne
          sont pas adaptés au tactile). Synthèse flotte en dernière carte. */}
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
          const otherColumns = COLUMNS.filter((c) => c.key !== "fullName" && !MOBILE_PRIMARY_KEYS.includes(c.key));

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
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5 text-sm tabular-nums text-foreground/70">
                      {otherColumns.map((col) => (
                        <div key={col.key} className="flex items-center justify-between">
                          <span className="text-foreground-muted">{col.label}</span>
                          {formatValue(row, col)}
                        </div>
                      ))}
                    </div>
                    {detailFor(row.driverId)}
                  </div>
                }
              />
            </div>
          );
        })}

        <div className="flex flex-col gap-1 rounded-2xl bg-accent p-4">
          <p className="text-sm font-semibold text-foreground">Total flotte</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums text-foreground/80">
            {COLUMNS.filter((c) => c.key !== "fullName").map((col) => (
              <span key={col.key}>
                <span className="text-foreground-muted">{col.label} : </span>
                {formatValue(summaryRow, col)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
