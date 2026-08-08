import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { WeeklyPlanner } from "@/components/WeeklyPlanner";
import { addDaysISO, mondayOf } from "@/lib/schedule";
import type { Database } from "@/types/database";

type ScheduleRow = Database["public"]["Tables"]["schedule"]["Row"];
type Sector = Database["public"]["Tables"]["sectors"]["Row"];

// Vue tableau (chauffeurs x jours de la semaine) pour planifier rapidement
// plusieurs jours à l'avance — pensée pour les chauffeurs "bouche-trou" qui
// changent de tournée souvent, contrairement aux chauffeurs réguliers déjà
// couverts par la mémorisation de tournée par défaut. Réservé au patron :
// déjà garanti par patron/layout.tsx (redirect si role !== "boss").
export default async function PlanificateurPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const weekStart = mondayOf(params.week);
  const weekEnd = addDaysISO(weekStart, 6);

  const supabase = await createClient();

  const [{ data: drivers }, { data: sectors }, { data: entries }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "driver")
      .eq("active", true)
      .order("full_name")
      .returns<{ id: string; full_name: string }[]>(),
    supabase.from("sectors").select("*").order("code").returns<Sector[]>(),
    supabase
      .from("schedule")
      .select("*")
      .gte("date", weekStart)
      .lte("date", weekEnd)
      .returns<ScheduleRow[]>(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">Calendrier</h1>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/patron/calendrier">Calendrier</Link>
        </Button>
        <Button variant="default" size="sm" asChild>
          <Link href="/patron/calendrier/planificateur">Planificateur</Link>
        </Button>
      </div>

      <WeeklyPlanner
        weekStart={weekStart}
        drivers={drivers ?? []}
        sectors={sectors ?? []}
        entries={entries ?? []}
      />
    </div>
  );
}
