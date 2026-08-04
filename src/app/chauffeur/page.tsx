import { createClient } from "@/lib/supabase/server";
import { getAuthUser, getCurrentProfile } from "@/lib/supabase/profile";
import { TourneeScreen } from "@/components/TourneeScreen";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];
type Sector = Database["public"]["Tables"]["sectors"]["Row"];
type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];

export default async function ChauffeurPage() {
  const supabase = await createClient();
  const [user, profile] = await Promise.all([getAuthUser(), getCurrentProfile()]);

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: todaysEntries }, { data: sectors }, { data: driverProfile }, { data: vehicles }] =
    await Promise.all([
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
        .select("default_sector_id, default_vehicle_id")
        .eq("id", user!.id)
        .single<{ default_sector_id: string | null; default_vehicle_id: string | null }>(),
      supabase.from("vehicles").select("*").order("plate").returns<Vehicle[]>(),
    ]);

  const inProgressEntry = (todaysEntries ?? []).find((e) => e.status === "in_progress") ?? null;
  const firstName = (profile?.full_name ?? "").split(" ")[0] || "!";

  return (
    <TourneeScreen
      firstName={firstName}
      inProgressEntry={inProgressEntry}
      sectors={sectors ?? []}
      defaultSectorId={driverProfile?.default_sector_id ?? null}
      defaultVehicleId={driverProfile?.default_vehicle_id ?? null}
      vehicles={vehicles ?? []}
    />
  );
}
