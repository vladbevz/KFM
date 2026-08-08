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

// Reste entièrement en UTC (Date.UTC + setUTCDate), même précaution que
// RentabiliteDateControl : passer par l'heure locale ferait perdre/gagner
// un jour selon le fuseau dès qu'il a un offset positif (ex. Europe/Paris).
function datesInRange(from: string, to: string): string[] {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const cursor = new Date(Date.UTC(fy, fm - 1, fd));
  const end = new Date(Date.UTC(ty, tm - 1, td));
  const dates: string[] = [];
  while (cursor.getTime() <= end.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export async function saveScheduleEntry(
  _prevState: ScheduleFormState,
  formData: FormData,
): Promise<ScheduleFormState> {
  const supabase = await createClient();

  const driverId = textOrNull(formData.get("driver_id"));
  const type = formData.get("type") as AssignmentType;
  const sectorId = textOrNull(formData.get("sector_id"));
  const note = textOrNull(formData.get("note"));
  const singleDate = textOrNull(formData.get("date"));
  const dateFrom = textOrNull(formData.get("date_from"));
  const dateTo = textOrNull(formData.get("date_to"));

  if (!driverId) {
    return { error: "Chauffeur obligatoire." };
  }
  if (!["tournee", "conge", "absence"].includes(type)) {
    return { error: "Statut invalide." };
  }

  let dates: string[];
  if (singleDate) {
    dates = [singleDate];
  } else if (dateFrom && dateTo) {
    if (dateFrom > dateTo) {
      return { error: "La date de début doit précéder la date de fin." };
    }
    dates = datesInRange(dateFrom, dateTo);
    if (dates.length > 366) {
      return { error: "Plage trop longue (1 an maximum)." };
    }
  } else {
    return { error: "Date obligatoire." };
  }

  // Une par une plutôt qu'un upsert groupé : une nouvelle ligne créée ici
  // par le patron est "prevu" (Module 2), mais éditer une ligne existante
  // ne doit jamais changer sa source (ex. une ligne déjà "reel" parce que le
  // chauffeur a démarré sa tournée reste "reel" même si le patron corrige la
  // note ensuite) — `source` est donc explicitement absente du payload
  // d'update, alors qu'elle est fixée à l'insert.
  for (const date of dates) {
    const { data: existing, error: fetchError } = await supabase
      .from("schedule")
      .select("id")
      .eq("driver_id", driverId)
      .eq("date", date)
      .maybeSingle<{ id: string }>();

    if (fetchError) return { error: fetchError.message };

    if (existing) {
      const { error } = await supabase
        .from("schedule")
        .update({ type, sector_id: type === "tournee" ? sectorId : null, note })
        .eq("id", existing.id);
      if (error) return { error: error.message };
    } else {
      const payload: ScheduleInsert = {
        driver_id: driverId,
        date,
        type,
        sector_id: type === "tournee" ? sectorId : null,
        note,
        source: "prevu",
      };
      const { error } = await supabase.from("schedule").insert(payload);
      if (error) return { error: error.message };
    }
  }

  revalidatePath("/patron/calendrier");
  revalidatePath("/patron/calendrier/planificateur");
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
