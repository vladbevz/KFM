import { createClient } from "@/lib/supabase/server";
import { getAuthUser, getCurrentProfile } from "@/lib/supabase/profile";
import { TourneeScreen } from "@/components/TourneeScreen";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];
type Sector = Database["public"]["Tables"]["sectors"]["Row"];

export default async function ChauffeurPage() {
  const supabase = await createClient();
  const [user, profile] = await Promise.all([getAuthUser(), getCurrentProfile()]);

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: todaysEntries }, { data: sectors }, { data: driverProfile }] = await Promise.all([
    supabase
      .from("daily_entries")
      .select("*")
      .eq("driver_id", user!.id)
      .eq("entry_date", today)
      .order("started_at", { ascending: false })
      .returns<DailyEntry[]>(),
    supabase.from("sectors").select("*").order("code").returns<Sector[]>(),
    supabase
      .from("profiles")
      .select("default_sector_id")
      .eq("id", user!.id)
      .single<{ default_sector_id: string | null }>(),
  ]);

  const inProgressEntry = (todaysEntries ?? []).find((e) => e.status === "in_progress") ?? null;
  const completedToday = (todaysEntries ?? []).filter((e) => e.status === "completed");
  const firstName = (profile?.full_name ?? "").split(" ")[0] || "!";

  return (
    <TourneeScreen
      firstName={firstName}
      inProgressEntry={inProgressEntry}
      completedToday={completedToday}
      sectors={sectors ?? []}
      defaultSectorId={driverProfile?.default_sector_id ?? null}
    />
  );
}
