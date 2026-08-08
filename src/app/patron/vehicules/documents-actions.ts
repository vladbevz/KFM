"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type VehicleDocInsert = Database["public"]["Tables"]["vehicle_documents"]["Insert"];
type VehicleDocUpdate = Database["public"]["Tables"]["vehicle_documents"]["Update"];

export interface DocumentFormState {
  error: string | null;
}

function textOrNull(value: FormDataEntryValue | null): string | null {
  const str = (value as string | null)?.trim();
  return str ? str : null;
}

export async function saveVehicleDocument(
  _prevState: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const supabase = await createClient();

  const id = textOrNull(formData.get("id"));
  const vehicleId = textOrNull(formData.get("vehicle_id"));
  const docName = textOrNull(formData.get("doc_name"));
  const expiryDate = textOrNull(formData.get("expiry_date"));
  const file = formData.get("file");

  if (!vehicleId) return { error: "Véhicule manquant." };
  if (!docName) return { error: "Le nom du document est obligatoire." };
  if (!id && !(file instanceof File && file.size > 0)) {
    return { error: "Un fichier est obligatoire." };
  }

  let fileUrl: string | undefined;
  if (file instanceof File && file.size > 0) {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${vehicleId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("vehicle-documents")
      .upload(path, file, { contentType: file.type || undefined });
    if (uploadError) {
      return { error: `Échec de l'envoi du fichier : ${uploadError.message}` };
    }
    fileUrl = path;
  }

  if (id) {
    const payload: VehicleDocUpdate = { doc_name: docName, expiry_date: expiryDate };
    if (fileUrl) payload.file_url = fileUrl;
    const { error } = await supabase.from("vehicle_documents").update(payload).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const payload: VehicleDocInsert = {
      vehicle_id: vehicleId,
      doc_name: docName,
      file_url: fileUrl!,
      expiry_date: expiryDate,
    };
    const { error } = await supabase.from("vehicle_documents").insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath(`/patron/vehicules/${vehicleId}`);
  revalidatePath("/patron/echeances");
  return { error: null };
}

export async function deleteVehicleDocument(id: string): Promise<DocumentFormState> {
  const supabase = await createClient();

  const { data: doc, error: fetchError } = await supabase
    .from("vehicle_documents")
    .select("vehicle_id, file_url")
    .eq("id", id)
    .single<{ vehicle_id: string; file_url: string | null }>();
  if (fetchError || !doc) return { error: "Document introuvable." };

  if (doc.file_url) {
    await supabase.storage.from("vehicle-documents").remove([doc.file_url]);
  }

  const { error } = await supabase.from("vehicle_documents").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/patron/vehicules/${doc.vehicle_id}`);
  revalidatePath("/patron/echeances");
  return { error: null };
}
