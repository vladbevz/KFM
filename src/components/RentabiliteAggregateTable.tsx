"use client";

import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExpandableCard } from "@/components/ExpandableCard";
import { RentabiliteEntryRow } from "@/components/RentabiliteEntryRow";
import {
  PAYMENT_TYPE_LABELS,
  aggregateRentabiliteByDriver,
  rentabiliteEntryRow,
  type Sector,
  type DriverRentabiliteSummary,
} from "@/lib/rentabilite";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
    new Date(`${iso}T00:00:00`),
  );
}

function tauxColor(taux: number | null): string {
  if (taux === null) return "text-foreground-muted";
  if (taux >= 80) return "text-enlevements";
  if (taux >= 50) return "text-warning";
  return "text-destructive";
}

function TauxCell({ taux }: { taux: number | null }) {
  return (
    <span className={`font-medium tabular-nums ${tauxColor(taux)}`}>
      {taux === null ? "—" : `${taux.toFixed(0)}%`}
    </span>
  );
}

function sortSummaries(summaries: DriverRentabiliteSummary[]): DriverRentabiliteSummary[] {
  return [...summaries].sort((a, b) => {
    if (a.tauxReussite === null && b.tauxReussite === null) return a.fullName.localeCompare(b.fullName);
    if (a.tauxReussite === null) return 1;
    if (b.tauxReussite === null) return -1;
    return a.tauxReussite - b.tauxReussite;
  });
}

function DriverDetail({ entries, sectorsById }: { entries: DailyEntry[]; sectorsById: Map<string, Sector> }) {
  const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-medium text-foreground/70">Date</th>
              <th className="px-3 py-2 text-left font-medium text-foreground/70">Tournée</th>
              <th className="px-3 py-2 text-left font-medium text-foreground/70">Paiement</th>
              <th className="px-3 py-2 text-right font-medium text-foreground/70">Objectif</th>
              <th className="px-3 py-2 text-right font-medium text-foreground/70">Réalisé</th>
              <th className="px-3 py-2 text-right font-medium text-foreground/70">Écart</th>
              <th className="px-3 py-2 text-left font-medium text-foreground/70">Statut</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => (
              <RentabiliteEntryRow
                key={entry.id}
                entry={entry}
                sectorsById={sectorsById}
                dateLabel={formatDate(entry.entry_date)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 md:hidden">
        {sorted.map((entry) => {
          const row = rentabiliteEntryRow(entry, sectorsById);
          return (
            <div key={entry.id} className="flex flex-col gap-1 rounded-md border border-border bg-background px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium tabular-nums text-foreground">
                  {formatDate(entry.entry_date)} · {row.sectorCode ?? "—"}
                </span>
                {row.paymentType && (
                  <Badge variant={row.paymentType === "a_la_pose" ? "info" : "secondary"} className="shrink-0">
                    {PAYMENT_TYPE_LABELS[row.paymentType]}
                  </Badge>
                )}
              </div>
              {row.objectif !== null && (
                <p className="tabular-nums text-foreground-muted">
                  Objectif : {row.objectif} · Réalisé : {row.realise} · Écart :{" "}
                  {row.ecart! > 0 ? `+${row.ecart}` : row.ecart}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// Vue agrégée par chauffeur sur une période, avec drill-down (détail jour
// par jour) à l'ouverture d'une ligne — réutilise RentabiliteEntryRow pour
// le détail, seule la colonne d'identification change (date au lieu de nom,
// puisqu'un seul chauffeur est affiché).
export function RentabiliteAggregateTable({
  drivers,
  entries,
  sectorsById,
}: {
  drivers: { id: string; full_name: string }[];
  entries: DailyEntry[];
  sectorsById: Map<string, Sector>;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const entriesByDriver = new Map<string, DailyEntry[]>();
  for (const entry of entries) {
    const list = entriesByDriver.get(entry.driver_id) ?? [];
    list.push(entry);
    entriesByDriver.set(entry.driver_id, list);
  }

  const summaries = sortSummaries(aggregateRentabiliteByDriver(entries, drivers, sectorsById));

  if (summaries.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-foreground-muted">
        Aucun chauffeur pour le moment.
      </p>
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chauffeur</TableHead>
              <TableHead className="text-right">Jours travaillés</TableHead>
              <TableHead className="text-right">Seuils atteints</TableHead>
              <TableHead className="text-right">Taux de réussite</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaries.map((s) => {
              const isOpen = expanded === s.driverId;
              return (
                <Fragment key={s.driverId}>
                  <TableRow
                    onClick={() => setExpanded(isOpen ? null : s.driverId)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-1.5">
                        <ChevronDown
                          className={`h-3.5 w-3.5 shrink-0 text-foreground-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                          strokeWidth={1.8}
                        />
                        {s.fullName}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{s.joursTravailles}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.seuilsAtteints}/{s.seuilsTotal}
                    </TableCell>
                    <TableCell className="text-right">
                      <TauxCell taux={s.tauxReussite} />
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow>
                      <TableCell colSpan={4} className="bg-background p-0">
                        <div className="p-3">
                          <DriverDetail
                            entries={entriesByDriver.get(s.driverId) ?? []}
                            sectorsById={sectorsById}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 md:hidden">
        {summaries.map((s) => (
          <ExpandableCard
            key={s.driverId}
            header={<p className="font-medium text-foreground">{s.fullName}</p>}
            primary={
              <div className="flex items-center gap-4 text-sm tabular-nums text-foreground/70">
                <span>
                  <span className="text-foreground-muted">Jours : </span>
                  {s.joursTravailles}
                </span>
                <span>
                  <span className="text-foreground-muted">Seuils : </span>
                  {s.seuilsAtteints}/{s.seuilsTotal}
                </span>
                <TauxCell taux={s.tauxReussite} />
              </div>
            }
            detail={
              <DriverDetail
                entries={entriesByDriver.get(s.driverId) ?? []}
                sectorsById={sectorsById}
              />
            }
          />
        ))}
      </div>
    </>
  );
}
