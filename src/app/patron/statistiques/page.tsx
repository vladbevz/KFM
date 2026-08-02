import { createClient } from "@/lib/supabase/server";
import { StatsControls } from "@/components/StatsControls";
import { StatsChart } from "@/components/StatsChart";
import { ComparisonTable } from "@/components/ComparisonTable";
import {
  aggregateByDriver,
  getPeriodRange,
  type Metric,
  type PeriodKey,
} from "@/lib/stats";
import type { Sector } from "@/lib/rentabilite";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

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
      : "30"
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
  const [{ data: drivers }, { data: entries }, { data: sectors }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "driver")
      .order("full_name")
      .returns<{ id: string; full_name: string }[]>(),
    entriesQuery.returns<DailyEntry[]>(),
    supabase.from("sectors").select("*").returns<Sector[]>(),
  ]);
  const sectorsById = new Map((sectors ?? []).map((s) => [s.id, s]));

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
        <StatsChart entries={entries ?? []} metric={metric} period={period} sectorsById={sectorsById} />
      ) : (
        <ComparisonTable
          data={aggregateByDriver(entries ?? [], drivers ?? [])}
        />
      )}
    </div>
  );
}
