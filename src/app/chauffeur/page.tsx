import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/profile";
import { DailyEntryScreen } from "@/components/DailyEntryScreen";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

export default async function ChauffeurPage() {
  const supabase = await createClient();
  const user = await getAuthUser();

  const today = new Date().toISOString().slice(0, 10);

  const { data: existingEntry } = await supabase
    .from("daily_entries")
    .select("*")
    .eq("driver_id", user!.id)
    .eq("entry_date", today)
    .maybeSingle<DailyEntry>();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">
        Saisie du jour
      </h1>
      <DailyEntryScreen existingEntry={existingEntry} />
    </div>
  );
}
