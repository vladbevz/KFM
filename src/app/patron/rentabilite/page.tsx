import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RentabiliteControls } from "@/components/RentabiliteControls";
import { RentabiliteDayTable } from "@/components/RentabiliteDayTable";
import { RentabiliteAggregateTable } from "@/components/RentabiliteAggregateTable";
import { KpiCard } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { computeRentabiliteKpis } from "@/lib/rentabilite";
import { getPeriodRange, type PeriodKey } from "@/lib/stats";
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

  const [{ data: drivers }, { data: sectors }, { data: entries }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "driver")
      .eq("active", true)
      .order("full_name")
      .returns<{ id: string; full_name: string }[]>(),
    supabase.from("sectors").select("*").returns<Sector[]>(),
    supabase
      .from("daily_entries")
      .select("*")
      .gte("entry_date", from)
      .lte("entry_date", to)
      .returns<DailyEntry[]>(),
  ]);

  const sectorsById = new Map((sectors ?? []).map((s) => [s.id, s]));
  const { met, total } = computeRentabiliteKpis(entries ?? [], sectorsById);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-foreground">Rentabilité</h1>
        <div className="flex items-center gap-2">
          <RentabiliteControls period={period} date={date} customFrom={customFrom} customTo={customTo} />
          <Link href="/patron/secteurs">
            <Button variant="outline" size="sm">
              Gérer les secteurs
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-3">
        <KpiCard value={`${met}/${total}`} label="Seuils atteints" />
        <KpiCard value={total > 0 ? `${((met / total) * 100).toFixed(0)}%` : "—"} label="Taux de réussite global" />
      </div>

      {isDayView ? (
        <RentabiliteDayTable drivers={drivers ?? []} entries={entries ?? []} sectorsById={sectorsById} />
      ) : (
        <RentabiliteAggregateTable drivers={drivers ?? []} entries={entries ?? []} sectorsById={sectorsById} />
      )}
    </div>
  );
}
