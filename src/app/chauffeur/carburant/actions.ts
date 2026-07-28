"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type FuelLogInsert = Database["public"]["Tables"]["fuel_logs"]["Insert"];

export interface FuelLogFormState {
  error: string | null;
}

function textOrNull(value: FormDataEntryValue | null): string | null {
  const str = (value as string | null)?.trim();
  return str ? str : null;
}

export async function addFuelLog(
  _prevState: FuelLogFormState,
  formData: FormData,
): Promise<FuelLogFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const vehicleId = textOrNull(formData.get("vehicle_id"));
  const litersStr = textOrNull(formData.get("liters"));
  const odometerStr = textOrNull(formData.get("odometer"));
  const filledAt = textOrNull(formData.get("filled_at"));

  if (!vehicleId) {
    return { error: "Sélectionne un véhicule." };
  }

  const liters = litersStr ? Number(litersStr) : NaN;
  const odometer = odometerStr ? Number(odometerStr) : NaN;

  if (!Number.isFinite(liters) || liters <= 0) {
    return { error: "Le nombre de litres est invalide." };
  }
  if (!Number.isFinite(odometer) || odometer < 0) {
    return { error: "Le kilométrage est invalide." };
  }

  const payload: FuelLogInsert = {
    driver_id: user.id,
    vehicle_id: vehicleId,
    liters,
    odometer: Math.trunc(odometer),
    filled_at: filledAt ?? new Date().toISOString().slice(0, 10),
  };

  const { error } = await supabase.from("fuel_logs").insert(payload);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/chauffeur/carburant");
  return { error: null };
}
