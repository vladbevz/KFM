"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database, VehicleStatus } from "@/types/database";

type VehicleInsert = Database["public"]["Tables"]["vehicles"]["Insert"];
type VehicleRepairInsert = Database["public"]["Tables"]["vehicle_repairs"]["Insert"];

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

export interface RepairFormState {
  error: string | null;
}

export async function saveVehicleRepair(
  _prevState: RepairFormState,
  formData: FormData,
): Promise<RepairFormState> {
  const supabase = await createClient();

  const vehicleId = textOrNull(formData.get("vehicle_id"));
  const description = textOrNull(formData.get("description"));
  const costStr = textOrNull(formData.get("cost"));
  const repairedAt = textOrNull(formData.get("repaired_at"));
  const vehicleIssueId = textOrNull(formData.get("vehicle_issue_id"));
  const file = formData.get("file");

  if (!vehicleId) return { error: "Véhicule manquant." };
  if (!description) return { error: "La description est obligatoire." };

  const cost = costStr ? Number(costStr) : NaN;
  if (!Number.isFinite(cost) || cost < 0) {
    return { error: "Le coût est invalide." };
  }

  let invoiceUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${vehicleId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("vehicle-repairs")
      .upload(path, file, { contentType: file.type || undefined });
    if (uploadError) {
      return { error: `Échec de l'envoi de la facture : ${uploadError.message}` };
    }
    invoiceUrl = path;
  }

  const payload: VehicleRepairInsert = {
    vehicle_id: vehicleId,
    vehicle_issue_id: vehicleIssueId,
    description,
    cost,
    repaired_at: repairedAt ?? undefined,
    invoice_url: invoiceUrl,
  };

  const { error } = await supabase.from("vehicle_repairs").insert(payload);
  if (error) return { error: error.message };

  // La réparation part souvent d'un signalement existant : le marquer résolu
  // automatiquement plutôt que de laisser le patron le faire séparément. Ne
  // touche pas au statut du véhicule (le "Marquer résolu" manuel ne le fait
  // pas non plus aujourd'hui — comportement inchangé).
  if (vehicleIssueId) {
    await resolveVehicleIssue(vehicleIssueId);
  }

  revalidatePath(`/patron/vehicules/${vehicleId}`);
  revalidatePath("/patron/vehicules/couts");
  return { error: null };
}

export interface VehicleActionState {
  error: string | null;
}

// Retrait réversible : conserve tout l'historique (réparations, pannes,
// pleins, documents), contrairement à la suppression définitive ci-dessous.
// Client serveur normal (pas de client admin nécessaire) : un véhicule n'a
// pas de ligne auth.users, la policy RLS vehicles_boss_update suffit — même
// approche que setVehicleStatus déjà en place.
export async function retireVehicle(vehicleId: string, retired: boolean): Promise<VehicleActionState> {
  const supabase = await createClient();

  const { error } = await supabase.from("vehicles").update({ retired }).eq("id", vehicleId);
  if (error) return { error: error.message };

  revalidatePath("/patron/vehicules");
  revalidatePath(`/patron/vehicules/${vehicleId}`);
  revalidatePath("/patron/vehicules/couts");
  return { error: null };
}

// Suppression définitive : réservée aux véhicules sans historique réel (ex.
// erreur de saisie à la création). Refuse explicitement s'il existe des
// pleins ou des réparations (vraies FK, pas de cascade voulue ici) plutôt
// que de laisser une erreur SQL brute remonter à l'écran.
export async function deleteVehicleForever(
  vehicleId: string,
  confirmPlate: string,
): Promise<VehicleActionState> {
  const supabase = await createClient();

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("plate")
    .eq("id", vehicleId)
    .maybeSingle<{ plate: string }>();

  if (!vehicle) return { error: "Véhicule introuvable." };
  if (confirmPlate !== vehicle.plate) {
    return { error: "L'immatriculation saisie ne correspond pas." };
  }

  const [{ count: fuelLogsCount }, { count: repairsCount }] = await Promise.all([
    supabase.from("fuel_logs").select("id", { count: "exact", head: true }).eq("vehicle_id", vehicleId),
    supabase.from("vehicle_repairs").select("id", { count: "exact", head: true }).eq("vehicle_id", vehicleId),
  ]);

  if ((fuelLogsCount ?? 0) > 0 || (repairsCount ?? 0) > 0) {
    return {
      error:
        "Ce véhicule a un historique (pleins et/ou réparations) — retire-le de la flotte plutôt que de le supprimer définitivement.",
    };
  }

  // Nettoyage best-effort des fichiers Storage (documents) : n'empêche pas
  // la suppression si ça échoue, ce ne sont que des fichiers orphelins.
  const { data: documents } = await supabase
    .from("vehicle_documents")
    .select("file_url")
    .eq("vehicle_id", vehicleId);
  if (documents && documents.length > 0) {
    await supabase.storage.from("vehicle-documents").remove(documents.map((d) => d.file_url));
  }

  // La FK profiles.default_vehicle_id n'a pas de ON DELETE : la vider
  // manuellement pour ne pas bloquer la suppression du véhicule.
  await supabase.from("profiles").update({ default_vehicle_id: null }).eq("default_vehicle_id", vehicleId);

  const { error } = await supabase.from("vehicles").delete().eq("id", vehicleId);
  if (error) return { error: error.message };

  revalidatePath("/patron/vehicules");
  revalidatePath("/patron/vehicules/couts");
  return { error: null };
}
