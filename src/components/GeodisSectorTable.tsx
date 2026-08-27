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

function Euros({ value }: { value: number | null }) {
  if (value === null) return <span className="text-foreground-muted">—</span>;
  return <span className="tabular-nums">{formatEuros(value)}</span>;
}

// Même structure théorique/réel/écart pour les deux modèles de paiement —
// pas de cas spécial ici : à la pose garde Objectif/Réalisé (poses) à côté,
// forfait affiche simplement "—" pour ces deux colonnes (cf. demande
// explicite).
function SectorDetail({ rows }: { rows: GeodisEntryRow[] }) {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-medium text-foreground/70">Date</th>
              <th className="px-3 py-2 text-left font-medium text-foreground/70">Chauffeur</th>
              <th className="px-3 py-2 text-right font-medium text-foreground/70">Objectif</th>
              <th className="px-3 py-2 text-right font-medium text-foreground/70">Réalisé</th>
              <th className="px-3 py-2 text-right font-medium text-foreground/70">Revenu théorique</th>
              <th className="px-3 py-2 text-right font-medium text-foreground/70">Revenu réel</th>
              <th className="px-3 py-2 text-right font-medium text-foreground/70">Écart</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.entryId} className="border-b border-border last:border-0">
                <td className="px-3 py-2 tabular-nums">{formatDate(row.date)}</td>
                <td className="px-3 py-2">{row.driverName}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {row.objectif ?? <span className="text-foreground-muted">—</span>}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {row.realise ?? <span className="text-foreground-muted">—</span>}
                </td>
                <td className="px-3 py-2 text-right">
                  <Euros value={row.revenuTheorique} />
                </td>
                <td className="px-3 py-2 text-right">
                  <Euros value={row.revenuReel} />
                </td>
                <td className="px-3 py-2 text-right">
                  {row.ecartEuros !== null ? <EcartAmount value={row.ecartEuros} /> : <Euros value={null} />}
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
              {row.ecartEuros !== null ? <EcartAmount value={row.ecartEuros} /> : <Euros value={null} />}
            </div>
            <p className="tabular-nums text-foreground-muted">
              {row.objectif !== null && row.realise !== null && (
                <>
                  Objectif : {row.objectif} · Réalisé : {row.realise} ·{" "}
                </>
              )}
              Théorique : <Euros value={row.revenuTheorique} /> · Réel : <Euros value={row.revenuReel} />
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

// Vue agrégée par secteur (tournée), avec drill-down jour par jour à
// l'ouverture d'une ligne — même schéma que RentabiliteAggregateTable, mais
// groupé par secteur plutôt que par chauffeur (le revenu Geodis se négocie
// tournée par tournée, pas chauffeur par chauffeur). Même structure
// théorique/réel/écart pour à la pose et forfait, aucune distinction de
// rendu entre les deux.
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
              <TableHead className="text-right">Revenu théorique cumulé</TableHead>
              <TableHead className="text-right">Revenu réel cumulé</TableHead>
              <TableHead className="text-right">Écart cumulé</TableHead>
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
                    <TableCell className="text-right tabular-nums">
                      {formatEuros(s.revenuTheoriqueCumule)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatEuros(s.revenuReelCumule)}</TableCell>
                    <TableCell className="text-right">
                      <EcartAmount value={s.ecartCumule} />
                      {s.hasUnpriced && <span className="ml-1 text-xs text-foreground-muted">(partiel)</span>}
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-background p-0">
                        <div className="p-3">
                          <SectorDetail rows={rowsBySector.get(s.sectorId) ?? []} />
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
                <EcartAmount value={s.ecartCumule} />
              </div>
            }
            detail={
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4 text-sm tabular-nums">
                  <span>Théorique : {formatEuros(s.revenuTheoriqueCumule)}</span>
                  <span>Réel : {formatEuros(s.revenuReelCumule)}</span>
                </div>
                {s.hasUnpriced && (
                  <p className="text-xs text-foreground-muted">
                    Prix ou montant non renseigné pour au moins une tournée — cumul partiel.
                  </p>
                )}
                <SectorDetail rows={rowsBySector.get(s.sectorId) ?? []} />
              </div>
            }
          />
        ))}
      </div>
    </>
  );
}
