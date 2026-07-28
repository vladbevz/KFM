import { createClient } from "@/lib/supabase/server";
import { RentabiliteDateControl } from "@/components/RentabiliteDateControl";
import { ProfitabilityBadges } from "@/components/ProfitabilityBadge";
import { dayProfitability, resolveDaySector } from "@/lib/rentabilite";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];
type Sector = Database["public"]["Tables"]["sectors"]["Row"];

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function RentabilitePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const date = params.date ?? toISODate(new Date());

  const supabase = await createClient();

  const [{ data: drivers }, { data: sectors }, { data: entries }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "driver")
      .order("full_name")
      .returns<{ id: string; full_name: string }[]>(),
    supabase.from("sectors").select("*").returns<Sector[]>(),
    supabase
      .from("daily_entries")
      .select("*")
      .eq("entry_date", date)
      .returns<DailyEntry[]>(),
  ]);

  const sectorsById = new Map((sectors ?? []).map((s) => [s.id, s]));
  const entryByDriver = new Map((entries ?? []).map((e) => [e.driver_id, e]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-foreground">Rentabilité</h1>
        <RentabiliteDateControl date={date} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Chauffeur</TableHead>
            <TableHead>Statut du jour</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(drivers ?? []).map((driver) => {
            const entry = entryByDriver.get(driver.id);
            return (
              <TableRow key={driver.id}>
                <TableCell className="font-medium">{driver.full_name}</TableCell>
                <TableCell>
                  {entry ? (
                    <ProfitabilityBadges
                      status={dayProfitability(entry, resolveDaySector(entry, sectorsById))}
                    />
                  ) : (
                    <span className="text-xs text-foreground/40">Aucune saisie</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
