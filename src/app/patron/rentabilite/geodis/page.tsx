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

  const [{ data: sectors }, { data: drivers }, { data: entries }] = await Promise.all([
    supabase.from("sectors").select("*").eq("payment_type", "a_la_pose").returns<Sector[]>(),
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
          .select("entry_id, price_per_pose")
          .in("entry_id", entryIds)
          .returns<{ entry_id: string; price_per_pose: number }[]>()
      : { data: [] as { entry_id: string; price_per_pose: number }[] };

  const sectorsById = new Map((sectors ?? []).map((s) => [s.id, s]));
  const driverNameById = new Map((drivers ?? []).map((d) => [d.id, d.full_name]));
  const priceSnapshotByEntryId = new Map((snapshots ?? []).map((s) => [s.entry_id, s.price_per_pose]));

  const rows = buildGeodisRows(entries ?? [], sectorsById, priceSnapshotByEntryId, driverNameById);
  const totalNet = rows.reduce((sum, r) => sum + r.ecartEuros, 0);
  const totalPertes = rows.reduce((sum, r) => sum + (r.ecartEuros < 0 ? r.ecartEuros : 0), 0);
  const totalGains = rows.reduce((sum, r) => sum + (r.ecartEuros > 0 ? r.ecartEuros : 0), 0);

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
        <h1 className="text-lg font-semibold text-foreground">Écart de rentabilité — Geodis</h1>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-4">
        <GeodisControls period={period} customFrom={customFrom} customTo={customTo} />

        <ExportButton
          columns={GEODIS_EXPORT_COLUMNS}
          rows={exportRows}
          filename={`ecart-geodis-${slugifyFilename(periodLabel)}`}
          title="KFM Suivi — Écart de rentabilité Geodis"
          subtitle={`Période : ${periodLabel}`}
        />
      </div>

      <div className="flex gap-3">
        <KpiCard
          value={formatEuros(totalNet)}
          label="Net sur la période"
          valueClassName={totalNet < 0 ? "text-destructive" : totalNet > 0 ? "text-enlevements" : undefined}
        />
        <KpiCard value={formatEuros(totalPertes)} label="Cumul pertes" valueClassName="text-destructive" />
        <KpiCard value={formatEuros(totalGains)} label="Cumul gains" valueClassName="text-enlevements" />
      </div>

      <GeodisSectorTable rows={rows} />
    </div>
  );
}
