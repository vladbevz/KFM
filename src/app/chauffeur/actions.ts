"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type DailyEntryInsert = Database["public"]["Tables"]["daily_entries"]["Insert"];
type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

export interface DailyEntryFormState {
  error: string | null;
  entry?: DailyEntry;
}

function textOrNull(value: FormDataEntryValue | null): string | null {
  const str = (value as string | null)?.trim();
  return str ? str : null;
}

function intOrNull(value: FormDataEntryValue | null): number | null {
  const str = (value as string | null)?.trim();
  if (!str) return null;
  const n = Number(str);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export async function saveDailyEntry(
  _prevState: DailyEntryFormState,
  formData: FormData,
): Promise<DailyEntryFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const vehicleRegistration = textOrNull(formData.get("vehicle_registration"));
  const kmDepart = intOrNull(formData.get("km_depart"));
  const kmArrivee = intOrNull(formData.get("km_arrivee"));

  if (!vehicleRegistration) {
    return { error: "L'immatriculation du véhicule est obligatoire." };
  }
  if (kmDepart === null || kmArrivee === null) {
    return { error: "Le kilométrage départ et arrivée sont obligatoires." };
  }
  if (kmArrivee < kmDepart) {
    return { error: "Le kilométrage d'arrivée doit être supérieur ou égal au départ." };
  }

  const entryDate = new Date().toISOString().slice(0, 10);

  const payload: DailyEntryInsert = {
    driver_id: user.id,
    entry_date: entryDate,
    vehicle_registration: vehicleRegistration,
    km_depart: kmDepart,
    km_arrivee: kmArrivee,
    matin_tournee_numero: textOrNull(formData.get("matin_tournee_numero")),
    matin_poses_livraison: intOrNull(formData.get("matin_poses_livraison")),
    matin_poses_enlevement: intOrNull(formData.get("matin_poses_enlevement")),
    matin_courses: textOrNull(formData.get("matin_courses")),
    apres_midi_tournee_numero: textOrNull(
      formData.get("apres_midi_tournee_numero"),
    ),
    apres_midi_poses_livraison: intOrNull(
      formData.get("apres_midi_poses_livraison"),
    ),
    apres_midi_poses_enlevement: intOrNull(
      formData.get("apres_midi_poses_enlevement"),
    ),
    apres_midi_courses: textOrNull(formData.get("apres_midi_courses")),
    anomalie_tournee: textOrNull(formData.get("anomalie_tournee")),
    anomalie_vehicule: textOrNull(formData.get("anomalie_vehicule")),
  };

  const { data, error } = await supabase
    .from("daily_entries")
    .upsert(payload, { onConflict: "driver_id,entry_date" })
    .select()
    .single<DailyEntry>();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/chauffeur");
  revalidatePath("/chauffeur/historique");
  revalidatePath("/chauffeur/statistiques");
  return { error: null, entry: data };
}
