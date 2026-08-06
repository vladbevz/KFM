import { createClient } from "@/lib/supabase/server";
import { CoutsFlotteControls } from "@/components/CoutsFlotteControls";
import { CoutsFlotteTable } from "@/components/CoutsFlotteTable";
import { aggregateRepairCostsByVehicle } from "@/lib/vehicles";
import { getPeriodRange, PERIOD_OPTIONS, type PeriodKey } from "@/lib/stats";
import type { Database } from "@/types/database";

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
type VehicleRepair = Database["public"]["Tables"]["vehicle_repairs"]["Row"];

export default async function CoutsFlottePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const period = (
    ["today", "7", "30", "90", "custom"].includes(params.period ?? "")
      ? params.period
      : "30"
  ) as PeriodKey;
  const customFrom = params.from ?? null;
  const customTo = params.to ?? null;

  const { from, to } = getPeriodRange(period, customFrom, customTo);

  const supabase = await createClient();

  // Tous les véhicules (actifs et retirés) : le coût d'un véhicule retiré
  // reste consultable ici, seule la liste opérationnelle /patron/vehicules
  // filtre par statut.
  const [{ data: vehicles }, { data: repairs }] = await Promise.all([
    supabase.from("vehicles").select("*").order("plate").returns<Vehicle[]>(),
    supabase
      .from("vehicle_repairs")
      .select("*")
      .gte("repaired_at", from)
      .lte("repaired_at", to)
      .returns<VehicleRepair[]>(),
  ]);

  const data = aggregateRepairCostsByVehicle(repairs ?? [], vehicles ?? []);
  const periodLabel =
    period === "custom"
      ? `${customFrom ?? "?"} au ${customTo ?? "?"}`
      : (PERIOD_OPTIONS.find((o) => o.key === period)?.label ?? period);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">Coût de la flotte</h1>

      <CoutsFlotteControls period={period} customFrom={customFrom} customTo={customTo} />

      <CoutsFlotteTable data={data} periodLabel={periodLabel} />
    </div>
  );
}
