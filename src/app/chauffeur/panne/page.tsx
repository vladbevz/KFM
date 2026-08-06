import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/profile";
import { ReportIssueForm } from "@/components/ReportIssueForm";
import type { Database } from "@/types/database";

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];

export default async function PannePage() {
  const supabase = await createClient();
  const user = await getAuthUser();

  const [{ data: vehicles }, { data: profile }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("retired", false).order("plate").returns<Vehicle[]>(),
    supabase
      .from("profiles")
      .select("default_vehicle_id")
      .eq("id", user!.id)
      .single<{ default_vehicle_id: string | null }>(),
  ]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">Signaler une panne</h1>
      <ReportIssueForm vehicles={vehicles ?? []} defaultVehicleId={profile?.default_vehicle_id} />
    </div>
  );
}
