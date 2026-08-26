import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ScheduleCalendar } from "@/components/ScheduleCalendar";
import { Button } from "@/components/ui/button";
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

  const [{ data: drivers }, { data: sectors }, { data: entries }, { count: pendingCount }] = await Promise.all([
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
    supabase.from("conge_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">Calendrier</h1>

      <div className="flex flex-wrap gap-2">
        <Button variant="default" size="sm" asChild>
          <Link href="/patron/calendrier">Calendrier</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/patron/calendrier/planificateur">Planificateur</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/patron/calendrier/demandes" className="inline-flex items-center gap-1.5">
            Demandes de congé
            {!!pendingCount && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
                {pendingCount}
              </span>
            )}
          </Link>
        </Button>
      </div>

      <ScheduleCalendar
        entries={entries ?? []}
        drivers={drivers ?? []}
        sectors={sectors ?? []}
      />
    </div>
  );
}
