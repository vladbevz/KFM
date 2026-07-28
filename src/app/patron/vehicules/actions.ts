"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database, VehicleStatus } from "@/types/database";

type VehicleInsert = Database["public"]["Tables"]["vehicles"]["Insert"];

export interface VehicleFormState {
  error: string | null;
}

function textOrNull(value: FormDataEntryValue | null): string | null {
  const str = (value as string | null)?.trim();
  return str ? str : null;
}

export async function saveVehicle(
  _prevState: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const supabase = await createClient();

  const id = textOrNull(formData.get("id"));
  const plate = textOrNull(formData.get("plate"));
  const label = textOrNull(formData.get("label"));

  if (!plate) {
    return { error: "L'immatriculation est obligatoire." };
  }

  const payload: VehicleInsert = { plate, label };

  const { error } = id
    ? await supabase.from("vehicles").update(payload).eq("id", id)
    : await supabase.from("vehicles").insert(payload);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/patron/vehicules");
  return { error: null };
}

export async function setVehicleStatus(vehicleId: string, status: VehicleStatus) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("vehicles")
    .update({ status })
    .eq("id", vehicleId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/patron/vehicules");
  revalidatePath(`/patron/vehicules/${vehicleId}`);
  return { error: null };
}

export async function resolveVehicleIssue(issueId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("vehicle_issues")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", issueId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/patron/vehicules");
  return { error: null };
}
