import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GeodisControls } from "@/components/GeodisControls";
import { GeodisSectorTable } from "@/components/GeodisSectorTable";
import { ExportButton } from "@/components/ExportButton";
import { KpiCard } from "@/components/KpiCard";
import {
  buildGeodisRows,
  buildGeodisExportRows,
  formatEuros,
  rowRevenue,
  GEODIS_EXPORT_COLUMNS,
} from "@/lib/geodis";
import type { Sector } from "@/lib/rentabilite";
import { slugifyFilename } from "@/lib/export";
import { getPeriodRange, formatPeriodLabel, type PeriodKey } from "@/lib/stats";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

export default async function GeodisEcartPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const period = (
    ["today", "7", "30", "90", "custom"].includes(params.period ?? "30")
      ? (params.period ?? "30")
      : "30"
  ) as PeriodKey;
  const customFrom = params.from ?? null;
  const customTo = params.to ?? null;
  const { from, to } = getPeriodRange(period, customFrom, customTo);

  const supabase = await createClient();

  // Tous les secteurs (à la pose et forfait) : le concept "écart de
  // rentabilité" couvre maintenant les deux modèles de paiement.
  const [{ data: sectors }, { data: drivers }, { data: entries }] = await Promise.all([
    supabase.from("sectors").select("*").returns<Sector[]>(),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "driver")
      .returns<{ id: string; full_name: string }[]>(),
    supabase
      .from("daily_entries")
      .select("*")
      .eq("status", "completed")
      .gte("entry_date", from)
      .lte("entry_date", to)
      .returns<DailyEntry[]>(),
  ]);

  const entryIds = (entries ?? []).map((e) => e.id);
  const { data: snapshots } =
    entryIds.length > 0
      ? await supabase
          .from("daily_entry_price_snapshots")
          .select("entry_id, price_per_pose, forfait_amount")
          .in("entry_id", entryIds)
          .returns<{ entry_id: string; price_per_pose: number | null; forfait_amount: number | null }[]>()
      : { data: [] as { entry_id: string; price_per_pose: number | null; forfait_amount: number | null }[] };

  const sectorsById = new Map((sectors ?? []).map((s) => [s.id, s]));
  const driverNameById = new Map((drivers ?? []).map((d) => [d.id, d.full_name]));
  const priceSnapshotByEntryId = new Map(
    (snapshots ?? []).filter((s) => s.price_per_pose !== null).map((s) => [s.entry_id, s.price_per_pose!]),
  );
  const forfaitSnapshotByEntryId = new Map(
    (snapshots ?? []).filter((s) => s.forfait_amount !== null).map((s) => [s.entry_id, s.forfait_amount!]),
  );

  const rows = buildGeodisRows(entries ?? [], sectorsById, priceSnapshotByEntryId, forfaitSnapshotByEntryId, driverNameById);

  // Les 3 cartes existantes restent strictement à la pose (comportement
  // inchangé, cf. demande explicite) ; "Revenu total" est la nouvelle
  // vision combinée (écarts à la pose + revenus forfait).
  const alaPoseRows = rows.filter((r) => r.type === "a_la_pose");
  const totalNet = alaPoseRows.reduce((sum, r) => sum + r.ecartEuros!, 0);
  const totalPertes = alaPoseRows.reduce((sum, r) => sum + (r.ecartEuros! < 0 ? r.ecartEuros! : 0), 0);
  const totalGains = alaPoseRows.reduce((sum, r) => sum + (r.ecartEuros! > 0 ? r.ecartEuros! : 0), 0);
  const revenueTotal = rows.reduce((sum, r) => sum + rowRevenue(r), 0);

  const periodLabel = formatPeriodLabel(period, from, to);
  const exportRows = buildGeodisExportRows(rows);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/patron/rentabilite"
          className="inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          Rentabilité
        </Link>
        <h1 className="text-lg font-semibold text-foreground">Statistiques financières — Geodis</h1>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-4">
        <GeodisControls period={period} customFrom={customFrom} customTo={customTo} />

        <ExportButton
          columns={GEODIS_EXPORT_COLUMNS}
          rows={exportRows}
          filename={`statistiques-financieres-geodis-${slugifyFilename(periodLabel)}`}
          title="KFM Suivi — Statistiques financières Geodis"
          subtitle={`Période : ${periodLabel}`}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <KpiCard
          value={formatEuros(revenueTotal)}
          label="Revenu total (à la pose + forfait)"
          valueClassName={revenueTotal < 0 ? "text-destructive" : revenueTotal > 0 ? "text-enlevements" : undefined}
        />
        <KpiCard
          value={formatEuros(totalNet)}
          label="Net à la pose"
          valueClassName={totalNet < 0 ? "text-destructive" : totalNet > 0 ? "text-enlevements" : undefined}
        />
        <KpiCard value={formatEuros(totalPertes)} label="Cumul pertes (à la pose)" valueClassName="text-destructive" />
        <KpiCard value={formatEuros(totalGains)} label="Cumul gains (à la pose)" valueClassName="text-enlevements" />
      </div>

      <GeodisSectorTable rows={rows} />
    </div>
  );
}
