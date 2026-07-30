import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DocumentBadge } from "@/components/DocumentBadge";
import { VehicleStatusBadge } from "@/components/VehicleStatusBadge";
import { getUpcomingEcheances } from "@/lib/echeances";
import { entryProfitability, resolveEntrySector, type Sector } from "@/lib/rentabilite";
import type { Database } from "@/types/database";

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

const ECHEANCES_SHOWN = 5;

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function PatronHomePage() {
  const supabase = await createClient();
  const today = toISODate(new Date());

  const [echeances, { data: vehiclesAttention }, { data: inProgressEntries }, { data: completedToday }, { data: sectors }] =
    await Promise.all([
      getUpcomingEcheances(supabase, 60),
      supabase
        .from("vehicles")
        .select("*")
        .neq("status", "operational")
        .order("plate")
        .returns<Vehicle[]>(),
      supabase
        .from("daily_entries")
        .select("driver_id, sector_id")
        .eq("status", "in_progress")
        .eq("entry_date", today)
        .returns<Pick<DailyEntry, "driver_id" | "sector_id">[]>(),
      supabase
        .from("daily_entries")
        .select("*")
        .eq("status", "completed")
        .eq("entry_date", today)
        .returns<DailyEntry[]>(),
      supabase.from("sectors").select("*").returns<Sector[]>(),
    ]);

  const driverIds = [...new Set((inProgressEntries ?? []).map((e) => e.driver_id))];
  const { data: driversInProgress } = driverIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", driverIds)
        .returns<{ id: string; full_name: string }[]>()
    : { data: [] as { id: string; full_name: string }[] };

  const sectorsById = new Map((sectors ?? []).map((s) => [s.id, s]));

  let met = 0;
  let notMet = 0;
  for (const entry of completedToday ?? []) {
    const status = entryProfitability(entry, resolveEntrySector(entry, sectorsById));
    if (status.kind === "tournee") {
      if (status.check.met) met += 1;
      else notMet += 1;
    }
  }

  const echeancesShown = echeances.slice(0, ECHEANCES_SHOWN);
  const hasEcheances = echeances.length > 0;
  const hasVehiclesAttention = (vehiclesAttention ?? []).length > 0;
  const hasDriversInProgress = (driversInProgress ?? []).length > 0;
  const hasRentabiliteDuJour = met + notMet > 0;
  const nothingToShow =
    !hasEcheances && !hasVehiclesAttention && !hasDriversInProgress && !hasRentabiliteDuJour;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-foreground">Accueil</h1>

      {nothingToShow && (
        <p className="py-12 text-center text-sm text-foreground/50">
          Rien à signaler aujourd&apos;hui.
        </p>
      )}

      {hasEcheances && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground/80">Échéances</h2>
            {echeances.length > ECHEANCES_SHOWN && (
              <Link href="/patron/echeances" className="text-sm text-km">
                Voir tout
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {echeancesShown.map((row) => (
              <Link
                key={row.id}
                href={row.href}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface p-4 hover:border-km"
              >
                <p className="text-sm font-medium text-foreground">
                  {row.kind} {row.subject} — {row.docName}
                </p>
                <DocumentBadge expiryDate={row.expiryDate} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {hasVehiclesAttention && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground/80">
            Camions nécessitant attention
          </h2>
          <div className="flex flex-col gap-2">
            {(vehiclesAttention ?? []).map((vehicle) => (
              <Link
                key={vehicle.id}
                href={`/patron/vehicules/${vehicle.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface p-4 hover:border-km"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{vehicle.plate}</p>
                  {vehicle.label && (
                    <p className="text-xs text-foreground/50">{vehicle.label}</p>
                  )}
                </div>
                <VehicleStatusBadge status={vehicle.status} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {hasDriversInProgress && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground/80">
            Chauffeurs en tournée aujourd&apos;hui ({driversInProgress!.length})
          </h2>
          <div className="flex flex-col gap-2">
            {driversInProgress!.map((driver) => (
              <Link
                key={driver.id}
                href={`/patron/chauffeurs/${driver.id}`}
                className="rounded-lg border border-border bg-surface p-4 text-sm font-medium text-foreground hover:border-km"
              >
                {driver.full_name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {hasRentabiliteDuJour && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground/80">Rentabilité du jour</h2>
          <div className="flex gap-3">
            <div className="flex-1 rounded-lg border border-border bg-surface p-4">
              <p className="text-2xl font-semibold tabular-nums text-enlevements">{met}</p>
              <p className="text-xs text-foreground/50">Seuil atteint</p>
            </div>
            <div className="flex-1 rounded-lg border border-border bg-surface p-4">
              <p className="text-2xl font-semibold tabular-nums text-red-400">{notMet}</p>
              <p className="text-xs text-foreground/50">Seuil non atteint</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
