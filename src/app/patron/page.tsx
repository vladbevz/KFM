import Link from "next/link";
import { AlertTriangle, BellRing } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DocumentBadge } from "@/components/DocumentBadge";
import { VehicleStatusBadge } from "@/components/VehicleStatusBadge";
import { getUpcomingEcheances } from "@/lib/echeances";
import { daysUntil } from "@/lib/documents";
import { computeRentabiliteKpis, type Sector } from "@/lib/rentabilite";
import { KpiCard } from "@/components/KpiCard";
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
        .eq("active", true)
        .returns<{ id: string; full_name: string }[]>()
    : { data: [] as { id: string; full_name: string }[] };

  const sectorsById = new Map((sectors ?? []).map((s) => [s.id, s]));

  const { met, total } = computeRentabiliteKpis(completedToday ?? [], sectorsById);
  const notMet = total - met;

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
              <Link href="/patron/echeances" className="text-sm text-foreground underline">
                Voir tout
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {echeancesShown.map((row) => {
              const expired = daysUntil(row.expiryDate) < 0;
              const Icon = expired ? AlertTriangle : BellRing;
              return (
                <Link
                  key={row.id}
                  href={row.href}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border-l-4 p-4 shadow-card ${
                    expired
                      ? "border-l-destructive bg-destructive/10"
                      : "border-l-warning bg-warning/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${expired ? "text-destructive" : "text-warning"}`}
                      strokeWidth={1.8}
                    />
                    <p className="text-sm font-medium text-foreground">
                      {row.kind} {row.subject} — {row.docName}
                    </p>
                  </div>
                  <DocumentBadge expiryDate={row.expiryDate} />
                </Link>
              );
            })}
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
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-surface shadow-card p-4 hover:border-foreground/30"
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
            Chauffeurs en tournée maintenant ({driversInProgress!.length})
          </h2>
          <div className="flex flex-col gap-2">
            {driversInProgress!.map((driver) => (
              <Link
                key={driver.id}
                href={`/patron/chauffeurs/${driver.id}`}
                className="rounded-2xl border border-border bg-surface shadow-card p-4 text-sm font-medium text-foreground hover:border-foreground/30"
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
          <Link href={`/patron/rentabilite?date=${today}`} className="flex gap-3">
            <KpiCard
              value={met}
              label="Seuil atteint"
              valueClassName="text-enlevements"
              className="transition-colors hover:border-foreground/30"
            />
            <KpiCard
              value={notMet}
              label="Seuil non atteint"
              valueClassName="text-destructive"
              className="transition-colors hover:border-foreground/30"
            />
          </Link>
        </div>
      )}
    </div>
  );
}
