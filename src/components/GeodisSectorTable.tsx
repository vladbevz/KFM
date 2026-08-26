"use client";

import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExpandableCard } from "@/components/ExpandableCard";
import { aggregateEcartBySector, formatEuros, type GeodisEntryRow } from "@/lib/geodis";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
    new Date(`${iso}T00:00:00`),
  );
}

function EcartAmount({ value }: { value: number }) {
  const color = value > 0 ? "text-enlevements" : value < 0 ? "text-destructive" : "text-foreground-muted";
  return <span className={`font-medium tabular-nums ${color}`}>{formatEuros(value)}</span>;
}

// Deux mises en page distinctes selon le modèle de paiement : à la pose
// garde le détail complet (objectif/réalisé/écart), forfait n'a qu'un
// revenu fixe par tournée — pas d'objectif ni d'écart, le concept n'existe
// pas pour ce modèle (cf. demande explicite).
function SectorDetail({ rows, type }: { rows: GeodisEntryRow[]; type: "a_la_pose" | "forfait" }) {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));

  if (type === "forfait") {
    return (
      <>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium text-foreground/70">Date</th>
                <th className="px-3 py-2 text-left font-medium text-foreground/70">Chauffeur</th>
                <th className="px-3 py-2 text-right font-medium text-foreground/70">Revenu (forfait)</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.entryId} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 tabular-nums">{formatDate(row.date)}</td>
                  <td className="px-3 py-2">{row.driverName}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.forfaitAmount !== null ? (
                      <EcartAmount value={row.forfaitAmount} />
                    ) : (
                      <span className="text-foreground-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2 md:hidden">
          {sorted.map((row) => (
            <div
              key={row.entryId}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <span className="font-medium tabular-nums text-foreground">
                {formatDate(row.date)} · {row.driverName}
              </span>
              {row.forfaitAmount !== null ? (
                <EcartAmount value={row.forfaitAmount} />
              ) : (
                <span className="text-foreground-muted">—</span>
              )}
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-medium text-foreground/70">Date</th>
              <th className="px-3 py-2 text-left font-medium text-foreground/70">Chauffeur</th>
              <th className="px-3 py-2 text-right font-medium text-foreground/70">Objectif</th>
              <th className="px-3 py-2 text-right font-medium text-foreground/70">Réalisé</th>
              <th className="px-3 py-2 text-right font-medium text-foreground/70">Écart (poses)</th>
              <th className="px-3 py-2 text-right font-medium text-foreground/70">Écart (€)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.entryId} className="border-b border-border last:border-0">
                <td className="px-3 py-2 tabular-nums">{formatDate(row.date)}</td>
                <td className="px-3 py-2">{row.driverName}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.objectif}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.realise}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {row.ecartPoses! > 0 ? `+${row.ecartPoses}` : row.ecartPoses}
                </td>
                <td className="px-3 py-2 text-right">
                  <EcartAmount value={row.ecartEuros!} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 md:hidden">
        {sorted.map((row) => (
          <div
            key={row.entryId}
            className="flex flex-col gap-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium tabular-nums text-foreground">
                {formatDate(row.date)} · {row.driverName}
              </span>
              <EcartAmount value={row.ecartEuros!} />
            </div>
            <p className="tabular-nums text-foreground-muted">
              Objectif : {row.objectif} · Réalisé : {row.realise} · Écart :{" "}
              {row.ecartPoses! > 0 ? `+${row.ecartPoses}` : row.ecartPoses} poses
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

// Vue agrégée par secteur (tournée), avec drill-down jour par jour à
// l'ouverture d'une ligne — même schéma que RentabiliteAggregateTable, mais
// groupé par secteur plutôt que par chauffeur (l'écart Geodis se négocie
// tournée par tournée, pas chauffeur par chauffeur). Mélange les secteurs à
// la pose (Cumul pertes/gains) et forfait (revenu fixe, pas de pertes/gains)
// dans la même table.
export function GeodisSectorTable({ rows }: { rows: GeodisEntryRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const rowsBySector = new Map<string, GeodisEntryRow[]>();
  for (const row of rows) {
    const list = rowsBySector.get(row.sectorId) ?? [];
    list.push(row);
    rowsBySector.set(row.sectorId, list);
  }

  const summaries = aggregateEcartBySector(rows);

  if (summaries.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-foreground-muted">
        Aucune tournée avec un prix par pose ou un montant forfait renseigné sur cette période.
      </p>
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tournée</TableHead>
              <TableHead className="text-right">Tournées</TableHead>
              <TableHead className="text-right">Cumul pertes</TableHead>
              <TableHead className="text-right">Cumul gains</TableHead>
              <TableHead className="text-right">Net / Revenu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaries.map((s) => {
              const isOpen = expanded === s.sectorId;
              return (
                <Fragment key={s.sectorId}>
                  <TableRow onClick={() => setExpanded(isOpen ? null : s.sectorId)} className="cursor-pointer">
                    <TableCell className="font-medium tabular-nums">
                      <span className="flex items-center gap-1.5">
                        <ChevronDown
                          className={`h-3.5 w-3.5 shrink-0 text-foreground-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                          strokeWidth={1.8}
                        />
                        {s.sectorCode}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{s.tourneesCount}</TableCell>
                    {s.type === "a_la_pose" ? (
                      <>
                        <TableCell className="text-right tabular-nums text-destructive">
                          {formatEuros(s.totalPertes)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-enlevements">
                          {formatEuros(s.totalGains)}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-right tabular-nums text-foreground-muted">—</TableCell>
                        <TableCell className="text-right tabular-nums text-foreground-muted">—</TableCell>
                      </>
                    )}
                    <TableCell className="text-right">
                      <EcartAmount value={s.totalEcartEuros} />
                      {s.hasUnpriced && <span className="ml-1 text-xs text-foreground-muted">(partiel)</span>}
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-background p-0">
                        <div className="p-3">
                          <SectorDetail rows={rowsBySector.get(s.sectorId) ?? []} type={s.type} />
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
            key={s.sectorId}
            header={<p className="font-medium tabular-nums text-foreground">{s.sectorCode}</p>}
            primary={
              <div className="flex items-center gap-4 text-sm tabular-nums text-foreground/70">
                <span>
                  <span className="text-foreground-muted">Tournées : </span>
                  {s.tourneesCount}
                </span>
                <EcartAmount value={s.totalEcartEuros} />
              </div>
            }
            detail={
              <div className="flex flex-col gap-3">
                {s.type === "a_la_pose" ? (
                  <div className="flex items-center gap-4 text-sm tabular-nums">
                    <span className="text-destructive">Pertes : {formatEuros(s.totalPertes)}</span>
                    <span className="text-enlevements">Gains : {formatEuros(s.totalGains)}</span>
                  </div>
                ) : (
                  s.hasUnpriced && (
                    <p className="text-xs text-foreground-muted">
                      Montant non renseigné pour au moins une tournée — revenu partiel.
                    </p>
                  )
                )}
                <SectorDetail rows={rowsBySector.get(s.sectorId) ?? []} type={s.type} />
              </div>
            }
          />
        ))}
      </div>
    </>
  );
}
