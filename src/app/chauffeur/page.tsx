import { createClient } from "@/lib/supabase/server";
import { DailyEntryForm } from "@/components/DailyEntryForm";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

export default async function ChauffeurPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
      <DailyEntryForm existingEntry={existingEntry} />
    </div>
  );
}
