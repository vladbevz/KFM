import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { ProfitabilityBadges } from "@/components/ProfitabilityBadge";
import { DispatchEcartBadge } from "@/components/DispatchEcartBadge";
import { PAYMENT_TYPE_LABELS, rentabiliteEntryRow, type Sector } from "@/lib/rentabilite";
import { dispatchEcart, dispatchEcartLivraisons, dispatchEcartEnlevements } from "@/lib/entries";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

function formatSigned(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

function statusBadge(row: ReturnType<typeof rentabiliteEntryRow>) {
  if (row.statusKind === "in_progress") {
    return <Badge variant="info">En tournée</Badge>;
  }
  if (row.statusKind === "forfait") {
    return <ProfitabilityBadges status={{ kind: "forfait" }} />;
  }
  if (row.statusKind === "none") {
    return <ProfitabilityBadges status={{ kind: "none" }} />;
  }
  return (
    <ProfitabilityBadges
      status={{
        kind: "a_la_pose",
        check: { actual: row.realise!, threshold: row.objectif!, met: row.statusKind === "met" },
      }}
    />
  );
}

// Une ligne = une tournée (entrée), partagée par la vue jour (une entrée par
// chauffeur peut y en avoir plusieurs) et le drill-down par chauffeur de la
// vue période — seule la première colonne change (nom vs date).
export function RentabiliteEntryRow({
  entry,
  sectorsById,
  driverName,
  dateLabel,
  repeated = false,
}: {
  entry: DailyEntry;
  sectorsById: Map<string, Sector>;
  driverName?: string;
  dateLabel?: string;
  // 2e tournée (ou plus) du même chauffeur ce jour-là : nom répété mais
  // grisé, pour garder chaque ligne autonome (triable, exportable telle
  // quelle) sans dupliquer visuellement le repère en gras à chaque ligne.
  repeated?: boolean;
}) {
  const row = rentabiliteEntryRow(entry, sectorsById);
  // Écarts séparés livraisons/enlèvements (migration 021), repli sur
  // l'écart combiné pour une tournée démarrée avant la séparation — même
  // logique que EntryCard.tsx côté chauffeur.
  const ecartLivraisons = dispatchEcartLivraisons(entry);
  const ecartEnlevements = dispatchEcartEnlevements(entry);
  const ecartCombine = ecartLivraisons === null && ecartEnlevements === null ? dispatchEcart(entry) : null;

  return (
    <TableRow>
      <TableCell className={repeated ? "font-normal text-foreground/40" : "font-medium"}>
        {driverName ?? dateLabel}
      </TableCell>
      <TableCell className="font-medium tabular-nums">{row.sectorCode ?? "—"}</TableCell>
      <TableCell>
        {row.paymentType ? (
          <Badge variant={row.paymentType === "a_la_pose" ? "info" : "secondary"}>
            {PAYMENT_TYPE_LABELS[row.paymentType]}
          </Badge>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">{row.objectif ?? "—"}</TableCell>
      <TableCell className="text-right tabular-nums">{row.realise ?? "—"}</TableCell>
      <TableCell className="text-right tabular-nums">
        {row.ecart !== null ? formatSigned(row.ecart) : "—"}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-1.5">
          {statusBadge(row)}
          {ecartCombine !== null && <DispatchEcartBadge ecart={ecartCombine} />}
          {ecartLivraisons !== null && (
            <DispatchEcartBadge ecart={ecartLivraisons} label="Écart livr." detailLabel="Écart livraisons avec le dispatch" />
          )}
          {ecartEnlevements !== null && (
            <DispatchEcartBadge ecart={ecartEnlevements} label="Écart enl." detailLabel="Écart enlèvements avec le dispatch" />
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
