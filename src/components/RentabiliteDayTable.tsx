import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RentabiliteEntryRow } from "@/components/RentabiliteEntryRow";
import type { ExportColumn, ExportRow } from "@/lib/export";
import { PAYMENT_TYPE_LABELS, rentabiliteEntryRow, type Sector } from "@/lib/rentabilite";
import type { Database } from "@/types/database";

// Exportées pour que la page compose un unique bouton "Exporter" dans son
// en-tête (groupé avec "Gérer les secteurs") plutôt que d'avoir ce bouton
// dupliqué dans chaque vue de tableau.
export const DAY_EXPORT_COLUMNS: ExportColumn[] = [
  { key: "chauffeur", label: "Chauffeur" },
  { key: "tournee", label: "Tournée" },
  { key: "paiement", label: "Paiement" },
  { key: "objectif", label: "Objectif", numeric: true },
  { key: "realise", label: "Réalisé", numeric: true },
  { key: "ecart", label: "Écart", numeric: true },
  { key: "statut", label: "Statut" },
];

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

function statusLabel(kind: ReturnType<typeof rentabiliteEntryRow>["statusKind"]): {
  text: string;
  variant: "success" | "destructive" | "secondary" | "info" | "outline";
} {
  switch (kind) {
    case "met":
      return { text: "Seuil atteint", variant: "success" };
    case "not_met":
      return { text: "Seuil non atteint", variant: "destructive" };
    case "forfait":
      return { text: "Forfait", variant: "secondary" };
    case "in_progress":
      return { text: "En tournée", variant: "info" };
    case "none":
      return { text: "—", variant: "outline" };
  }
}

function groupEntriesByDriver(entries: DailyEntry[]): Map<string, DailyEntry[]> {
  const entriesByDriver = new Map<string, DailyEntry[]>();
  for (const entry of entries) {
    const list = entriesByDriver.get(entry.driver_id) ?? [];
    list.push(entry);
    entriesByDriver.set(entry.driver_id, list);
  }
  return entriesByDriver;
}

export function buildDayExportRows(
  drivers: { id: string; full_name: string }[],
  entries: DailyEntry[],
  sectorsById: Map<string, Sector>,
): ExportRow[] {
  const entriesByDriver = groupEntriesByDriver(entries);
  return drivers.flatMap((driver) => {
    const driverEntries = entriesByDriver.get(driver.id) ?? [];
    if (driverEntries.length === 0) {
      return [
        {
          chauffeur: driver.full_name,
          tournee: "—",
          paiement: "—",
          objectif: "—",
          realise: "—",
          ecart: "—",
          statut: "Aucune saisie",
        },
      ];
    }
    return driverEntries.map((entry) => {
      const row = rentabiliteEntryRow(entry, sectorsById);
      return {
        chauffeur: driver.full_name,
        tournee: row.sectorCode ?? "—",
        paiement: row.paymentType ? PAYMENT_TYPE_LABELS[row.paymentType] : "—",
        objectif: row.objectif ?? "—",
        realise: row.realise ?? "—",
        ecart: row.ecart !== null ? (row.ecart > 0 ? `+${row.ecart}` : row.ecart) : "—",
        statut: statusLabel(row.statusKind).text,
      };
    });
  });
}

// Vue enrichie d'un jour donné : une ligne par tournée (un chauffeur avec
// deux tournées le même jour a deux lignes), plus une ligne "Aucune saisie"
// pour chaque chauffeur sans entrée ce jour-là.
export function RentabiliteDayTable({
  drivers,
  entries,
  sectorsById,
}: {
  drivers: { id: string; full_name: string }[];
  entries: DailyEntry[];
  sectorsById: Map<string, Sector>;
}) {
  const entriesByDriver = groupEntriesByDriver(entries);

  if (drivers.length === 0) {
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
              <TableHead>Tournée</TableHead>
              <TableHead>Paiement</TableHead>
              <TableHead className="text-right">Objectif</TableHead>
              <TableHead className="text-right">Réalisé</TableHead>
              <TableHead className="text-right">Écart</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map((driver) => {
              const driverEntries = entriesByDriver.get(driver.id) ?? [];
              if (driverEntries.length === 0) {
                return (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.full_name}</TableCell>
                    <TableCell colSpan={5} className="text-foreground/40">
                      —
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Aucune saisie</Badge>
                    </TableCell>
                  </TableRow>
                );
              }
              return driverEntries.map((entry) => (
                <RentabiliteEntryRow
                  key={entry.id}
                  entry={entry}
                  sectorsById={sectorsById}
                  driverName={driver.full_name}
                />
              ));
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 md:hidden">
        {drivers.map((driver) => {
          const driverEntries = entriesByDriver.get(driver.id) ?? [];
          if (driverEntries.length === 0) {
            return (
              <div
                key={driver.id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-surface shadow-card p-4"
              >
                <p className="font-medium text-foreground">{driver.full_name}</p>
                <Badge variant="outline">Aucune saisie</Badge>
              </div>
            );
          }
          return driverEntries.map((entry) => {
            const row = rentabiliteEntryRow(entry, sectorsById);
            const status = statusLabel(row.statusKind);
            return (
              <div
                key={entry.id}
                className="flex flex-col gap-2 rounded-2xl border border-border bg-surface shadow-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground">{driver.full_name}</p>
                  <Badge variant={status.variant}>{status.text}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground/70">
                  <span className="font-medium tabular-nums">{row.sectorCode ?? "—"}</span>
                  {row.paymentType && (
                    <Badge variant={row.paymentType === "a_la_pose" ? "info" : "secondary"}>
                      {PAYMENT_TYPE_LABELS[row.paymentType]}
                    </Badge>
                  )}
                </div>
                {row.objectif !== null && (
                  <p className="text-sm tabular-nums text-foreground-muted">
                    Objectif : {row.objectif} · Réalisé : {row.realise} · Écart :{" "}
                    {row.ecart! > 0 ? `+${row.ecart}` : row.ecart}
                  </p>
                )}
              </div>
            );
          });
        })}
      </div>
    </>
  );
}
