"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/profile";
import { datesInRange } from "@/lib/schedule";
import type { AssignmentType, Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type ScheduleInsert = Database["public"]["Tables"]["schedule"]["Insert"];

export interface ScheduleFormState {
  error: string | null;
}

function textOrNull(value: FormDataEntryValue | null): string | null {
  const str = (value as string | null)?.trim();
  return str ? str : null;
}

// Une par une plutôt qu'un upsert groupé : une nouvelle ligne créée ici est
// "prevu" (Module 2), mais éditer une ligne existante ne doit jamais changer
// sa source (ex. une ligne déjà "reel" parce que le chauffeur a démarré sa
// tournée reste "reel" même si le patron corrige la note ensuite) — `source`
// est donc explicitement absente du payload d'update, alors qu'elle est
// fixée à l'insert. Partagée par saveScheduleEntry (création manuelle) et
// approveCongeRequest (approbation d'une demande) — même mécanisme, cf.
// demande explicite de ne pas inventer une nouvelle logique de calendrier.
async function upsertScheduleDates(
  supabase: SupabaseClient<Database>,
  driverId: string,
  dates: string[],
  type: AssignmentType,
  sectorId: string | null,
  note: string | null,
): Promise<string | null> {
  for (const date of dates) {
    const { data: existing, error: fetchError } = await supabase
      .from("schedule")
      .select("id")
      .eq("driver_id", driverId)
      .eq("date", date)
      .maybeSingle<{ id: string }>();

    if (fetchError) return fetchError.message;

    if (existing) {
      const { error } = await supabase
        .from("schedule")
        .update({ type, sector_id: type === "tournee" ? sectorId : null, note })
        .eq("id", existing.id);
      if (error) return error.message;
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
      if (error) return error.message;
    }
  }
  return null;
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

  const upsertError = await upsertScheduleDates(supabase, driverId, dates, type, sectorId, note);
  if (upsertError) return { error: upsertError };

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

export interface CongeRequestActionState {
  error: string | null;
}

// Approuve une demande de congé : alimente schedule (type 'conge', source
// 'prevu') pour chaque jour de la plage — même mécanisme que la création
// manuelle côté patron (upsertScheduleDates), pas de nouvelle logique de
// calendrier à inventer, cf. demande explicite.
export async function approveCongeRequest(
  _prevState: CongeRequestActionState,
  formData: FormData,
): Promise<CongeRequestActionState> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { error: "Non authentifié." };

  const id = textOrNull(formData.get("id"));
  if (!id) return { error: "Demande introuvable." };

  const { data: request, error: fetchError } = await supabase
    .from("conge_requests")
    .select("driver_id, start_date, end_date, status")
    .eq("id", id)
    .single<{ driver_id: string; start_date: string; end_date: string; status: string }>();

  if (fetchError || !request) return { error: "Demande introuvable." };
  if (request.status !== "pending") return { error: "Cette demande a déjà été traitée." };

  const dates = datesInRange(request.start_date, request.end_date);
  const upsertError = await upsertScheduleDates(supabase, request.driver_id, dates, "conge", null, null);
  if (upsertError) return { error: upsertError };

  const { error } = await supabase
    .from("conge_requests")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/patron/calendrier");
  revalidatePath("/patron/calendrier/demandes");
  revalidatePath("/chauffeur/planning");
  return { error: null };
}

export async function rejectCongeRequest(
  _prevState: CongeRequestActionState,
  formData: FormData,
): Promise<CongeRequestActionState> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { error: "Non authentifié." };

  const id = textOrNull(formData.get("id"));
  if (!id) return { error: "Demande introuvable." };

  const { error } = await supabase
    .from("conge_requests")
    .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq("id", id)
    .eq("status", "pending");
  if (error) return { error: error.message };

  revalidatePath("/patron/calendrier/demandes");
  revalidatePath("/chauffeur/planning");
  return { error: null };
}
