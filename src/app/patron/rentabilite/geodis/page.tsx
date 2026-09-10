import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GeodisControls } from "@/components/GeodisControls";
import { GeodisSectorTable } from "@/components/GeodisSectorTable";
import { GeodisExportButton } from "@/components/GeodisExportButton";
import { KpiCard } from "@/components/KpiCard";
import { buildGeodisRows, formatEuros } from "@/lib/geodis";
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

  // .in("entry_id", entryIds) sur des centaines d'ids dépasse la longueur de
  // requête acceptée par PostgREST (échoue silencieusement en "Bad Request"
  // — confirmé avec ~660 tournées sur 30 jours) : découpe en lots.
  const entryIds = (entries ?? []).map((e) => e.id);
  const SNAPSHOT_CHUNK_SIZE = 200;
  const snapshotChunks = await Promise.all(
    Array.from({ length: Math.ceil(entryIds.length / SNAPSHOT_CHUNK_SIZE) }, (_, i) =>
      supabase
        .from("daily_entry_price_snapshots")
        .select("entry_id, price_per_pose, forfait_amount")
        .in("entry_id", entryIds.slice(i * SNAPSHOT_CHUNK_SIZE, (i + 1) * SNAPSHOT_CHUNK_SIZE))
        .returns<{ entry_id: string; price_per_pose: number | null; forfait_amount: number | null }[]>(),
    ),
  );
  const snapshots = snapshotChunks.flatMap((chunk) => chunk.data ?? []);

  const sectorsById = new Map((sectors ?? []).map((s) => [s.id, s]));
  const driverNameById = new Map((drivers ?? []).map((d) => [d.id, d.full_name]));
  const priceSnapshotByEntryId = new Map(
    (snapshots ?? []).filter((s) => s.price_per_pose !== null).map((s) => [s.entry_id, s.price_per_pose!]),
  );
  const forfaitSnapshotByEntryId = new Map(
    (snapshots ?? []).filter((s) => s.forfait_amount !== null).map((s) => [s.entry_id, s.forfait_amount!]),
  );

  const rows = buildGeodisRows(entries ?? [], sectorsById, priceSnapshotByEntryId, forfaitSnapshotByEntryId, driverNameById);

  // Même paire théorique/réel pour les deux modèles de paiement, sommée
  // directement — le forfait contribue également aux deux totaux (théorique
  // = réel pour une tournée forfait), donc s'annule naturellement dans
  // l'écart total sans cas particulier ici.
  const revenuTheoriqueTotal = rows.reduce((sum, r) => sum + (r.revenuTheorique ?? 0), 0);
  const revenuReelTotal = rows.reduce((sum, r) => sum + (r.revenuReel ?? 0), 0);
  const ecartTotal = revenuReelTotal - revenuTheoriqueTotal;

  const periodLabel = formatPeriodLabel(period, from, to);

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
        <h1 className="text-lg font-semibold text-foreground">Statistiques financières</h1>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-4">
        <GeodisControls period={period} customFrom={customFrom} customTo={customTo} />

        <GeodisExportButton
          rows={rows}
          filename={`statistiques-financieres-${slugifyFilename(periodLabel)}`}
          periodLabel={periodLabel}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <KpiCard value={formatEuros(revenuTheoriqueTotal)} label="Revenu théorique total" />
        <KpiCard value={formatEuros(revenuReelTotal)} label="Revenu réel total" />
        <KpiCard
          value={formatEuros(ecartTotal)}
          label="Écart total"
          valueClassName={ecartTotal < 0 ? "text-destructive" : ecartTotal > 0 ? "text-enlevements" : undefined}
        />
      </div>

      <GeodisSectorTable rows={rows} />
    </div>
  );
}
