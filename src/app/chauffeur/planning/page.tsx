import { createClient } from "@/lib/supabase/server";
import { getAuthUser, getCurrentProfile } from "@/lib/supabase/profile";
import { ScheduleCalendar } from "@/components/ScheduleCalendar";
import type { Database } from "@/types/database";

type ScheduleRow = Database["public"]["Tables"]["schedule"]["Row"];
type Sector = Database["public"]["Tables"]["sectors"]["Row"];

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function PlanningPage() {
  const supabase = await createClient();
  const [user, profile] = await Promise.all([getAuthUser(), getCurrentProfile()]);

  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const to = new Date(today.getFullYear(), today.getMonth() + 2, 0);

  const [{ data: entries }, { data: sectors }] = await Promise.all([
    supabase
      .from("schedule")
      .select("*")
      .eq("driver_id", user!.id)
      .gte("date", toISODate(from))
      .lte("date", toISODate(to))
      .returns<ScheduleRow[]>(),
    supabase.from("sectors").select("*").returns<Sector[]>(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">Mon planning</h1>
      <ScheduleCalendar
        entries={entries ?? []}
        drivers={profile ? [{ id: profile.id, full_name: profile.full_name }] : []}
        sectors={sectors ?? []}
        readOnly
      />
    </div>
  );
}
