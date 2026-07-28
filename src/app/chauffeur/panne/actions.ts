"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { VehicleStatus } from "@/types/database";

export interface ReportIssueFormState {
  error: string | null;
  success?: boolean;
}

function textOrNull(value: FormDataEntryValue | null): string | null {
  const str = (value as string | null)?.trim();
  return str ? str : null;
}

export async function reportVehicleIssue(
  _prevState: ReportIssueFormState,
  formData: FormData,
): Promise<ReportIssueFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const vehicleId = textOrNull(formData.get("vehicle_id"));
  const newStatus = formData.get("new_status") as VehicleStatus;
  const description = textOrNull(formData.get("description"));
  const photo = formData.get("photo");

  if (!vehicleId) {
    return { error: "Sélectionne un véhicule." };
  }
  if (newStatus !== "issue_running" && newStatus !== "unavailable") {
    return { error: "Statut invalide." };
  }
  if (!description) {
    return { error: "Décris rapidement le problème." };
  }

  let photoPath: string | null = null;

  if (photo instanceof File && photo.size > 0) {
    photoPath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("vehicle-issues")
      .upload(photoPath, photo, { contentType: "image/jpeg" });

    if (uploadError) {
      return { error: `Échec de l'envoi de la photo : ${uploadError.message}` };
    }
  }

  const { error } = await supabase.rpc("report_vehicle_issue", {
    p_vehicle_id: vehicleId,
    p_new_status: newStatus,
    p_description: description,
    p_photo_url: photoPath,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/patron/vehicules");
  return { error: null, success: true };
}
