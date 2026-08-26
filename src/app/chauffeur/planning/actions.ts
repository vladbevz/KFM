"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type CongeRequestInsert = Database["public"]["Tables"]["conge_requests"]["Insert"];

export interface RequestCongeState {
  error: string | null;
}

function textOrNull(value: FormDataEntryValue | null): string | null {
  const str = (value as string | null)?.trim();
  return str ? str : null;
}

export async function requestConge(
  _prevState: RequestCongeState,
  formData: FormData,
): Promise<RequestCongeState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const startDate = textOrNull(formData.get("start_date"));
  const endDate = textOrNull(formData.get("end_date"));
  const note = textOrNull(formData.get("note"));

  if (!startDate || !endDate) {
    return { error: "Les dates de début et de fin sont obligatoires." };
  }
  if (startDate > endDate) {
    return { error: "La date de début doit précéder la date de fin." };
  }

  const payload: CongeRequestInsert = {
    driver_id: user.id,
    start_date: startDate,
    end_date: endDate,
    note,
  };

  const { error } = await supabase.from("conge_requests").insert(payload);
  if (error) return { error: error.message };

  revalidatePath("/chauffeur/planning");
  return { error: null };
}
