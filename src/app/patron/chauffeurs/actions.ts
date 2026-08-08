"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type DriverDocInsert = Database["public"]["Tables"]["driver_documents"]["Insert"];
type DriverDocUpdate = Database["public"]["Tables"]["driver_documents"]["Update"];

export interface DocumentFormState {
  error: string | null;
}

function textOrNull(value: FormDataEntryValue | null): string | null {
  const str = (value as string | null)?.trim();
  return str ? str : null;
}

export async function saveDriverDocument(
  _prevState: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const supabase = await createClient();

  const id = textOrNull(formData.get("id"));
  const driverId = textOrNull(formData.get("driver_id"));
  const docName = textOrNull(formData.get("doc_name"));
  const expiryDate = textOrNull(formData.get("expiry_date"));
  const file = formData.get("file");

  if (!driverId) return { error: "Chauffeur manquant." };
  if (!docName) return { error: "Le nom du document est obligatoire." };

  let fileUrl: string | undefined;
  if (file instanceof File && file.size > 0) {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${driverId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("driver-documents")
      .upload(path, file, { contentType: file.type || undefined });
    if (uploadError) {
      return { error: `Échec de l'envoi du fichier : ${uploadError.message}` };
    }
    fileUrl = path;
  }

  if (id) {
    const payload: DriverDocUpdate = { doc_name: docName, expiry_date: expiryDate };
    if (fileUrl) payload.file_url = fileUrl;
    const { error } = await supabase.from("driver_documents").update(payload).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const payload: DriverDocInsert = {
      driver_id: driverId,
      doc_name: docName,
      file_url: fileUrl ?? null,
      expiry_date: expiryDate,
    };
    const { error } = await supabase.from("driver_documents").insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath(`/patron/chauffeurs/${driverId}`);
  revalidatePath("/patron/echeances");
  return { error: null };
}

export async function deleteDriverDocument(id: string): Promise<DocumentFormState> {
  const supabase = await createClient();

  const { data: doc, error: fetchError } = await supabase
    .from("driver_documents")
    .select("driver_id, file_url")
    .eq("id", id)
    .single<{ driver_id: string; file_url: string | null }>();
  if (fetchError || !doc) return { error: "Document introuvable." };

  if (doc.file_url) {
    await supabase.storage.from("driver-documents").remove([doc.file_url]);
  }

  const { error } = await supabase.from("driver_documents").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/patron/chauffeurs/${doc.driver_id}`);
  revalidatePath("/patron/echeances");
  return { error: null };
}
