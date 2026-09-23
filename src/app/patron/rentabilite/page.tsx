import Link from "next/link";
import { Settings2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { RentabiliteControls } from "@/components/RentabiliteControls";
import {
  RentabiliteDayTable,
  DAY_EXPORT_COLUMNS,
  buildDayExportRows,
} from "@/components/RentabiliteDayTable";
import { RentabiliteAggregateTable } from "@/components/RentabiliteAggregateTable";
import { RentabiliteExportButton } from "@/components/RentabiliteExportButton";
import { GeodisSectorTable } from "@/components/GeodisSectorTable";
import { GeodisExportButton } from "@/components/GeodisExportButton";
import { KpiCard } from "@/components/KpiCard";
import {
  computeRentabiliteKpis,
  AGGREGATE_EXPORT_COLUMNS,
  buildAggregateExportRows,
} from "@/lib/rentabilite";
import { buildGeodisRows, formatEuros } from "@/lib/geodis";
import { slugifyFilename } from "@/lib/export";
import { getPeriodRange, formatPeriodLabel, type PeriodKey } from "@/lib/stats";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];
type Sector = Database["public"]["Tables"]["sectors"]["Row"];

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function RentabilitePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const view = params.view === "operationnel" ? "operationnel" : "financier";
  // "Aujourd'hui" par défaut (décision explicite) — cohérent avec le
  // nouveau défaut de l'onglet Statistiques (Partie 3).
  const period = (
    ["today", "7", "30", "90", "custom"].includes(params.period ?? "today")
      ? (params.period ?? "today")
      : "today"
  ) as PeriodKey;
  const date = params.date ?? toISODate(new Date());
  const customFrom = params.from ?? null;
  const customTo = params.to ?? null;
  const isDayView = period === "today";

  const supabase = await createClient();

  const { from, to } = isDayView
    ? { from: date, to: date }
    : getPeriodRange(period, customFrom, customTo);

  // Tous les chauffeurs (actifs + anciens) pour retrouver le nom dans les
  // lignes financières historiques ; seuls les actifs alimentent les
  // tableaux/exports opérationnels (même précédent que l'ancienne page).
  const [{ data: allDrivers }, { data: sectors }, { data: entries }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, active")
      .eq("role", "driver")
      .order("full_name")
      .returns<{ id: string; full_name: string; active: boolean }[]>(),
    supabase.from("sectors").select("*").returns<Sector[]>(),
    supabase
      .from("daily_entries")
      .select("*")
      .gte("entry_date", from)
      .lte("entry_date", to)
      .returns<DailyEntry[]>(),
  ]);

  const drivers = (allDrivers ?? []).filter((d) => d.active);
  const sectorsById = new Map((sectors ?? []).map((s) => [s.id, s]));
  const driverNameById = new Map((allDrivers ?? []).map((d) => [d.id, d.full_name]));

  // .in("entry_id", entryIds) sur des centaines d'ids dépasse la longueur de
  // requête acceptée par PostgREST — découpe en lots (cf. ancienne page
  // Statistiques financières, même limite rencontrée).
  const completedEntries = (entries ?? []).filter((e) => e.status === "completed");
  const entryIds = completedEntries.map((e) => e.id);
  const SNAPSHOT_CHUNK_SIZE = 200;
  const snapshotChunks = await Promise.all(
    Array.from({ length: Math.ceil(entryIds.length / SNAPSHOT_CHUNK_SIZE) }, (_, i) =>
      supabase
        .from("daily_entry_price_snapshots")
        .select("entry_id, price_per_pose, forfait_amount, price_per_enlevement")
        .in("entry_id", entryIds.slice(i * SNAPSHOT_CHUNK_SIZE, (i + 1) * SNAPSHOT_CHUNK_SIZE))
        .returns<
          { entry_id: string; price_per_pose: number | null; forfait_amount: number | null; price_per_enlevement: number | null }[]
        >(),
    ),
  );
  const snapshots = snapshotChunks.flatMap((chunk) => chunk.data ?? []);
  const priceSnapshotByEntryId = new Map(
    snapshots.filter((s) => s.price_per_pose !== null).map((s) => [s.entry_id, s.price_per_pose!]),
  );
  const forfaitSnapshotByEntryId = new Map(
    snapshots.filter((s) => s.forfait_amount !== null).map((s) => [s.entry_id, s.forfait_amount!]),
  );
  const enlevementPriceSnapshotByEntryId = new Map(
    snapshots.filter((s) => s.price_per_enlevement !== null).map((s) => [s.entry_id, s.price_per_enlevement!]),
  );

  const geodisRows = buildGeodisRows(
    completedEntries,
    sectorsById,
    priceSnapshotByEntryId,
    forfaitSnapshotByEntryId,
    driverNameById,
    enlevementPriceSnapshotByEntryId,
  );
  const revenuTheoriqueTotal = geodisRows.reduce((sum, r) => sum + (r.revenuTheorique ?? 0), 0);
  const revenuReelTotal = geodisRows.reduce((sum, r) => sum + (r.revenuReel ?? 0), 0);
  const ecartTotal = revenuReelTotal - revenuTheoriqueTotal;

  const { met, total } = computeRentabiliteKpis(entries ?? [], sectorsById);
  const dateLabel = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
    new Date(`${date}T00:00:00`),
  );
  const periodLabel = formatPeriodLabel(period, from, to);

  const operationalExportRows = isDayView
    ? buildDayExportRows(drivers, entries ?? [], sectorsById)
    : buildAggregateExportRows(drivers, entries ?? [], sectorsById);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-foreground">Rentabilité</h1>
        <Link
          href="/patron/secteurs"
          className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground"
        >
          <Settings2 className="h-3.5 w-3.5" strokeWidth={1.8} />
          Gérer les tournées
        </Link>
      </div>

      <RentabiliteControls
        period={period}
        date={date}
        customFrom={customFrom}
        customTo={customTo}
        view={view}
        actions={
          view === "financier" ? (
            <GeodisExportButton
              rows={geodisRows}
              filename={`rentabilite-financier-${slugifyFilename(periodLabel)}`}
              periodLabel={periodLabel}
            />
          ) : (
            <RentabiliteExportButton
              columns={isDayView ? DAY_EXPORT_COLUMNS : AGGREGATE_EXPORT_COLUMNS}
              rows={operationalExportRows}
              filename={`rentabilite-operationnel-${slugifyFilename(isDayView ? dateLabel : periodLabel)}`}
              title="KFM Suivi — Rentabilité opérationnelle"
              subtitle={isDayView ? `Jour : ${dateLabel}` : `Période : ${periodLabel}`}
            />
          )
        }
      />

      {/* Argent en premier, toujours visible quelle que soit la vue active */}
      <div className="flex flex-wrap gap-3">
        <KpiCard value={formatEuros(revenuTheoriqueTotal)} label="Revenu théorique" />
        <KpiCard value={formatEuros(revenuReelTotal)} label="Revenu réel" />
        <KpiCard
          value={formatEuros(ecartTotal)}
          label="Écart"
          valueClassName={ecartTotal < 0 ? "text-destructive" : ecartTotal > 0 ? "text-enlevements" : undefined}
        />
      </div>

      {view === "financier" ? (
        <GeodisSectorTable rows={geodisRows} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <KpiCard value={`${met}/${total}`} label="Seuils atteints" />
            <KpiCard
              value={total > 0 ? `${((met / total) * 100).toFixed(0)}%` : "—"}
              label="Taux de réussite global"
            />
          </div>

          {isDayView ? (
            <RentabiliteDayTable drivers={drivers} entries={entries ?? []} sectorsById={sectorsById} />
          ) : (
            <RentabiliteAggregateTable drivers={drivers} entries={entries ?? []} sectorsById={sectorsById} />
          )}
        </div>
      )}
    </div>
  );
}
