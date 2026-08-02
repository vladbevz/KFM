"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AssignmentType, Database } from "@/types/database";

type ScheduleInsert = Database["public"]["Tables"]["schedule"]["Insert"];

export interface ScheduleFormState {
  error: string | null;
}

function textOrNull(value: FormDataEntryValue | null): string | null {
  const str = (value as string | null)?.trim();
  return str ? str : null;
}

export async function saveScheduleEntry(
  _prevState: ScheduleFormState,
  formData: FormData,
): Promise<ScheduleFormState> {
  const supabase = await createClient();

  const driverId = textOrNull(formData.get("driver_id"));
  const date = textOrNull(formData.get("date"));
  const type = formData.get("type") as AssignmentType;
  const sectorId = textOrNull(formData.get("sector_id"));
  const note = textOrNull(formData.get("note"));

  if (!driverId || !date) {
    return { error: "Chauffeur et date sont obligatoires." };
  }
  if (!["tournee", "conge", "absence"].includes(type)) {
    return { error: "Statut invalide." };
  }

  const payload: ScheduleInsert = {
    driver_id: driverId,
    date,
    type,
    sector_id: type === "tournee" ? sectorId : null,
    note,
  };

  const { error } = await supabase
    .from("schedule")
    .upsert(payload, { onConflict: "driver_id,date" });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/patron/calendrier");
  return { error: null };
}

export async function deleteScheduleEntry(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("schedule").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/patron/calendrier");
  return { error: null };
}
