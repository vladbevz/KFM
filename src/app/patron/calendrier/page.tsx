import { createClient } from "@/lib/supabase/server";
import { ScheduleCalendar } from "@/components/ScheduleCalendar";
import type { Database } from "@/types/database";

type ScheduleRow = Database["public"]["Tables"]["schedule"]["Row"];
type Sector = Database["public"]["Tables"]["sectors"]["Row"];

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function CalendrierPage() {
  const supabase = await createClient();

  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  const to = new Date(today.getFullYear(), today.getMonth() + 3, 0);

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
      .gte("date", toISODate(from))
      .lte("date", toISODate(to))
      .returns<ScheduleRow[]>(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">Calendrier</h1>
      <ScheduleCalendar
        entries={entries ?? []}
        drivers={drivers ?? []}
        sectors={sectors ?? []}
      />
    </div>
  );
}
