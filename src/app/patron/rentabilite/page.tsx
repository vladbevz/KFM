import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RentabiliteDateControl } from "@/components/RentabiliteDateControl";
import { ProfitabilityBadges } from "@/components/ProfitabilityBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { entryProfitability, resolveEntrySector } from "@/lib/rentabilite";
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

  // Plusieurs tournées possibles pour un même chauffeur ce jour-là.
  const entriesByDriver = new Map<string, DailyEntry[]>();
  for (const entry of entries ?? []) {
    const list = entriesByDriver.get(entry.driver_id) ?? [];
    list.push(entry);
    entriesByDriver.set(entry.driver_id, list);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-foreground">Rentabilité</h1>
        <div className="flex items-center gap-2">
          <RentabiliteDateControl date={date} />
          <Link href="/patron/secteurs">
            <Button variant="outline" size="sm">
              Gérer les secteurs
            </Button>
          </Link>
        </div>
      </div>

      {(drivers ?? []).length === 0 ? (
        <p className="py-12 text-center text-sm text-foreground-muted">
          Aucun chauffeur pour le moment.
        </p>
      ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Chauffeur</TableHead>
            <TableHead>Statut du jour</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(drivers ?? []).map((driver) => {
            const driverEntries = entriesByDriver.get(driver.id) ?? [];
            return (
              <TableRow key={driver.id}>
                <TableCell className="font-medium">{driver.full_name}</TableCell>
                <TableCell>
                  {driverEntries.length === 0 ? (
                    <span className="text-xs text-foreground/40">Aucune saisie</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {driverEntries.map((entry) =>
                        entry.status === "in_progress" ? (
                          <Badge key={entry.id} variant="info">
                            En tournée
                          </Badge>
                        ) : (
                          <ProfitabilityBadges
                            key={entry.id}
                            status={entryProfitability(entry, resolveEntrySector(entry, sectorsById))}
                          />
                        ),
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      )}
    </div>
  );
}
