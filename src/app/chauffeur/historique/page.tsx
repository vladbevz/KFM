import { createClient } from "@/lib/supabase/server";
import { EntryCard } from "@/components/EntryCard";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

export default async function HistoriquePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: entries } = await supabase
    .from("daily_entries")
    .select("*")
    .eq("driver_id", user!.id)
    .order("entry_date", { ascending: false })
    .returns<DailyEntry[]>();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">Historique</h1>

      {!entries || entries.length === 0 ? (
        <p className="py-12 text-center text-sm text-foreground/50">
          Aucun rapport enregistré pour le moment.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
