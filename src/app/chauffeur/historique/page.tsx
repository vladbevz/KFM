import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/profile";
import { EntryCard } from "@/components/EntryCard";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];
type Sector = Database["public"]["Tables"]["sectors"]["Row"];

export default async function HistoriquePage() {
  const supabase = await createClient();
  const user = await getAuthUser();

  const [{ data: entries }, { data: sectors }] = await Promise.all([
    supabase
      .from("daily_entries")
      .select("*")
      .eq("driver_id", user!.id)
      .order("entry_date", { ascending: false })
      .returns<DailyEntry[]>(),
    supabase.from("sectors").select("*").returns<Sector[]>(),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">Historique</h1>

      {!entries || entries.length === 0 ? (
        <p className="py-12 text-center text-sm text-foreground/50">
          Aucun rapport enregistré pour le moment.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              sectors={sectors ?? []}
              editable={entry.entry_date === today}
            />
          ))}
        </div>
      )}
    </div>
  );
}
