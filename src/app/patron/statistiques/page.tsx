import { createClient } from "@/lib/supabase/server";
import { StatsControls } from "@/components/StatsControls";
import { StatsChart } from "@/components/StatsChart";
import { ComparisonTable } from "@/components/ComparisonTable";
import {
  aggregateDriverStats,
  getPeriodRange,
  getPreviousPeriodRange,
  sumLitersByDriver,
  formatPeriodLabel,
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
  const view = params.view === "tableau" ? "tableau" : "graphique";
  const period = (
    ["today", "7", "30", "90", "custom"].includes(params.period ?? "")
      ? params.period
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

  // Requêtes indépendantes : exécutées en parallèle plutôt qu'en séquence
  // pour éviter d'additionner deux allers-retours réseau vers Supabase.
  // Uniquement en vue Tableau : période précédente + pleins, pour les
  // moyennes/tendance du tableau comparatif. Le graphique n'en a pas besoin.
  const prevRange = view === "tableau" ? getPreviousPeriodRange(from, to) : null;

  const [{ data: drivers }, { data: entries }, { data: sectors }, prevEntriesResult, fuelLogsResult, prevFuelLogsResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "driver")
        .order("full_name")
        .returns<{ id: string; full_name: string }[]>(),
      entriesQuery.returns<DailyEntry[]>(),
      supabase.from("sectors").select("*").returns<Sector[]>(),
      prevRange
        ? supabase
            .from("daily_entries")
            .select("*")
            .gte("entry_date", prevRange.from)
            .lte("entry_date", prevRange.to)
            .returns<DailyEntry[]>()
        : Promise.resolve({ data: null }),
      view === "tableau"
        ? supabase
            .from("fuel_logs")
            .select("driver_id, liters")
            .gte("filled_at", from)
            .lte("filled_at", to)
            .returns<Pick<FuelLog, "driver_id" | "liters">[]>()
        : Promise.resolve({ data: null }),
      prevRange
        ? supabase
            .from("fuel_logs")
            .select("driver_id, liters")
            .gte("filled_at", prevRange.from)
            .lte("filled_at", prevRange.to)
            .returns<Pick<FuelLog, "driver_id" | "liters">[]>()
        : Promise.resolve({ data: null }),
    ]);
  const sectorsById = new Map((sectors ?? []).map((s) => [s.id, s]));
  const periodLabel = formatPeriodLabel(period, from, to);

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
          prevData={aggregateDriverStats(
            prevEntriesResult.data ?? [],
            drivers ?? [],
            sectorsById,
            sumLitersByDriver(prevFuelLogsResult.data ?? []),
          )}
          periodLabel={periodLabel}
        />
      )}
    </div>
  );
}
