import { createClient } from "@/lib/supabase/server";
import { StatsControls } from "@/components/StatsControls";
import { StatsChart } from "@/components/StatsChart";
import { ComparisonTable } from "@/components/ComparisonTable";
import { KpiCard } from "@/components/KpiCard";
import {
  aggregateDriverStats,
  getPeriodRange,
  sumLitersByDriver,
  formatPeriodLabel,
  entryKm,
  entryPoses,
  entryEnlevements,
  type Metric,
  type PeriodKey,
} from "@/lib/stats";
import type { Sector } from "@/lib/rentabilite";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];
type FuelLog = Database["public"]["Tables"]["fuel_logs"]["Row"];

export default async function PatronStatistiquesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  // "Tableau" par défaut plutôt que "Graphique" : c'est la vue comparative
  // entre chauffeurs, la plus consultée — le graphique reste à un clic.
  const view = params.view === "graphique" ? "graphique" : "tableau";
  // "Aujourd'hui" par défaut : avec le tableau en vue par défaut (une ligne
  // par chauffeur, pas une barre unique), une période courte redevient la
  // plus utile en première vue.
  const period = (
    ["today", "7", "30", "90", "custom"].includes(params.period ?? "today")
      ? (params.period ?? "today")
      : "today"
  ) as PeriodKey;
  const metric = (["km", "poses", "enlevements"].includes(params.metric ?? "")
    ? params.metric
    : "km") as Metric;
  const selectedDriverId = params.driver ?? "all";
  const customFrom = params.from ?? null;
  const customTo = params.to ?? null;

  const { from, to } = getPeriodRange(period, customFrom, customTo);

  const supabase = await createClient();

  let entriesQuery = supabase
    .from("daily_entries")
    .select("*")
    .gte("entry_date", from)
    .lte("entry_date", to);

  if (view === "graphique" && selectedDriverId !== "all") {
    entriesQuery = entriesQuery.eq("driver_id", selectedDriverId);
  }

  const [{ data: drivers }, { data: entries }, { data: sectors }, fuelLogsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "driver")
      .order("full_name")
      .returns<{ id: string; full_name: string }[]>(),
    entriesQuery.returns<DailyEntry[]>(),
    supabase.from("sectors").select("*").returns<Sector[]>(),
    view === "tableau"
      ? supabase
          .from("fuel_logs")
          .select("driver_id, liters")
          .gte("filled_at", from)
          .lte("filled_at", to)
          .returns<Pick<FuelLog, "driver_id" | "liters">[]>()
      : Promise.resolve({ data: null }),
  ]);
  const sectorsById = new Map((sectors ?? []).map((s) => [s.id, s]));
  const periodLabel = formatPeriodLabel(period, from, to);

  // Prix figés par tournée (revenu théorique/réel du détail au clic, vue
  // Tableau uniquement) — même chunking que Rentabilité/Accueil, la requête
  // .in() dépasse la longueur acceptée par PostgREST au-delà de ~200 ids.
  let priceSnapshotByEntryId = new Map<string, number>();
  let forfaitSnapshotByEntryId = new Map<string, number>();
  let enlevementPriceSnapshotByEntryId = new Map<string, number>();
  if (view === "tableau") {
    const entryIds = (entries ?? []).filter((e) => e.status === "completed").map((e) => e.id);
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
    priceSnapshotByEntryId = new Map(
      snapshots.filter((s) => s.price_per_pose !== null).map((s) => [s.entry_id, s.price_per_pose!]),
    );
    forfaitSnapshotByEntryId = new Map(
      snapshots.filter((s) => s.forfait_amount !== null).map((s) => [s.entry_id, s.forfait_amount!]),
    );
    enlevementPriceSnapshotByEntryId = new Map(
      snapshots.filter((s) => s.price_per_enlevement !== null).map((s) => [s.entry_id, s.price_per_enlevement!]),
    );
  }

  // Rangée de totaux, visible dans les deux vues : comble l'espace vide
  // sous un graphique à une seule métrique et donne un chiffre scannable
  // sans devoir déjà lire le graphique ou le tableau.
  let totalKm = 0;
  let totalPoses = 0;
  let totalEnlevements = 0;
  for (const entry of entries ?? []) {
    totalKm += entryKm(entry);
    totalPoses += entryPoses(entry);
    totalEnlevements += entryEnlevements(entry);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">
        Statistiques des chauffeurs
      </h1>

      <StatsControls
        view={view}
        period={period}
        customFrom={customFrom}
        customTo={customTo}
        metric={view === "graphique" ? metric : undefined}
        drivers={view === "graphique" ? (drivers ?? []) : undefined}
        selectedDriverId={selectedDriverId}
      />

      <div className="flex flex-wrap gap-3">
        <KpiCard value={totalKm.toLocaleString("fr-FR")} label="Kilomètres" />
        <KpiCard value={totalPoses.toLocaleString("fr-FR")} label="Poses (livraison)" />
        <KpiCard value={totalEnlevements.toLocaleString("fr-FR")} label="Enlèvements" />
      </div>

      {view === "graphique" ? (
        <StatsChart
          entries={entries ?? []}
          metric={metric}
          period={period}
          sectorsById={sectorsById}
          groupByTournee={selectedDriverId !== "all"}
        />
      ) : (
        <ComparisonTable
          data={aggregateDriverStats(
            entries ?? [],
            drivers ?? [],
            sectorsById,
            sumLitersByDriver(fuelLogsResult.data ?? []),
          )}
          periodLabel={periodLabel}
          entries={entries ?? []}
          sectorsById={sectorsById}
          priceSnapshotByEntryId={priceSnapshotByEntryId}
          forfaitSnapshotByEntryId={forfaitSnapshotByEntryId}
          enlevementPriceSnapshotByEntryId={enlevementPriceSnapshotByEntryId}
        />
      )}
    </div>
  );
}
