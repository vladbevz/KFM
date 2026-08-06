import type { Database } from "@/types/database";

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
type VehicleRepair = Database["public"]["Tables"]["vehicle_repairs"]["Row"];

export interface VehicleCostSummary {
  vehicleId: string;
  plate: string;
  label: string | null;
  retired: boolean;
  totalCost: number;
}

// Coût total des réparations par véhicule sur un ensemble de vehicle_repairs
// déjà filtré par période. Tous les véhicules apparaissent, actifs comme
// retirés (le coût d'un véhicule retiré reste consultable) — même précédent
// que aggregateByDriver/aggregateRentabiliteByDriver.
export function aggregateRepairCostsByVehicle(
  repairs: VehicleRepair[],
  vehicles: Vehicle[],
): VehicleCostSummary[] {
  const costByVehicle = new Map<string, number>();
  for (const repair of repairs) {
    costByVehicle.set(repair.vehicle_id, (costByVehicle.get(repair.vehicle_id) ?? 0) + Number(repair.cost));
  }

  return vehicles.map((vehicle) => ({
    vehicleId: vehicle.id,
    plate: vehicle.plate,
    label: vehicle.label,
    retired: vehicle.retired,
    totalCost: costByVehicle.get(vehicle.id) ?? 0,
  }));
}
