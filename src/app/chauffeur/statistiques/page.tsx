import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/profile";
import { StatsControls } from "@/components/StatsControls";
import { StatsChartLazy as StatsChart } from "@/components/StatsChartLazy";
import {
  entryEnlevements,
  entryKm,
  entryPoses,
  getPeriodRange,
  METRIC_OPTIONS,
  type Metric,
  type PeriodKey,
} from "@/lib/stats";
import type { Database } from "@/types/database";
import type { Sector } from "@/lib/rentabilite";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

function SummaryCard({
  label,
  total,
  average,
  color,
}: {
  label: string;
  total: number;
  average: number;
  color: string;
}) {
  return (
    <div className="flex-1 rounded-2xl border border-border bg-surface shadow-card p-4">
      <p className="text-sm text-foreground/60">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums" style={{ color }}>
        {total}
      </p>
      <p className="text-xs tabular-nums text-foreground/50">
        Moy. {average} / jour
      </p>
    </div>
  );
}

export default async function StatistiquesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const period = (
    ["today", "7", "30", "90", "custom"].includes(params.period ?? "")
      ? params.period
      : "30"
  ) as PeriodKey;
  const metric = (["km", "poses", "enlevements"].includes(params.metric ?? "")
    ? params.metric
    : "km") as Metric;
  const customFrom = params.from ?? null;
  const customTo = params.to ?? null;

  const { from, to } = getPeriodRange(period, customFrom, customTo);

  const supabase = await createClient();
  const user = await getAuthUser();

  const [{ data: entries }, { data: sectors }] = await Promise.all([
    supabase
      .from("daily_entries")
      .select("*")
      .eq("driver_id", user!.id)
      .gte("entry_date", from)
      .lte("entry_date", to)
      .returns<DailyEntry[]>(),
    supabase.from("sectors").select("*").returns<Sector[]>(),
  ]);

  const rows = entries ?? [];
  const sectorsById = new Map((sectors ?? []).map((s) => [s.id, s]));
  const jours = rows.length;
  const totalKm = rows.reduce((sum, e) => sum + entryKm(e), 0);
  const totalPoses = rows.reduce((sum, e) => sum + entryPoses(e), 0);
  const totalEnlevements = rows.reduce((sum, e) => sum + entryEnlevements(e), 0);
  const avg = (total: number) => (jours > 0 ? Math.round((total / jours) * 10) / 10 : 0);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">Mes statistiques</h1>

      <StatsControls
        period={period}
        customFrom={customFrom}
        customTo={customTo}
        metric={metric}
        size="lg"
      />

      <StatsChart entries={rows} metric={metric} period={period} sectorsById={sectorsById} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SummaryCard
          label="Kilomètres"
          total={totalKm}
          average={avg(totalKm)}
          color={METRIC_OPTIONS[0].color}
        />
        <SummaryCard
          label="Poses livraison"
          total={totalPoses}
          average={avg(totalPoses)}
          color={METRIC_OPTIONS[1].color}
        />
        <SummaryCard
          label="Enlèvements"
          total={totalEnlevements}
          average={avg(totalEnlevements)}
          color={METRIC_OPTIONS[2].color}
        />
      </div>
    </div>
  );
}
