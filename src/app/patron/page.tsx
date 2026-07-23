import { createClient } from "@/lib/supabase/server";
import { StatsControls } from "@/components/StatsControls";
import { StatsChart } from "@/components/StatsChart";
import { ComparisonTable } from "@/components/ComparisonTable";
import {
  aggregateByDate,
  aggregateByDriver,
  getPeriodRange,
  type Metric,
  type PeriodKey,
} from "@/lib/stats";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

export default async function PatronPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const view = params.view === "tableau" ? "tableau" : "graphique";
  const period = (["7", "30", "90", "custom"].includes(params.period ?? "")
    ? params.period
    : "30") as PeriodKey;
  const metric = (["km", "poses", "enlevements"].includes(params.metric ?? "")
    ? params.metric
    : "km") as Metric;
  const selectedDriverId = params.driver ?? "all";
  const customFrom = params.from ?? null;
  const customTo = params.to ?? null;

  const { from, to } = getPeriodRange(period, customFrom, customTo);

  const supabase = await createClient();

  const { data: drivers } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "driver")
    .order("full_name")
    .returns<{ id: string; full_name: string }[]>();

  let entriesQuery = supabase
    .from("daily_entries")
    .select("*")
    .gte("entry_date", from)
    .lte("entry_date", to);

  if (view === "graphique" && selectedDriverId !== "all") {
    entriesQuery = entriesQuery.eq("driver_id", selectedDriverId);
  }

  const { data: entries } = await entriesQuery.returns<DailyEntry[]>();

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
        <StatsChart data={aggregateByDate(entries ?? [])} metric={metric} />
      ) : (
        <ComparisonTable
          data={aggregateByDriver(entries ?? [], drivers ?? [])}
        />
      )}
    </div>
  );
}
