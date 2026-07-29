"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database, TourneeType } from "@/types/database";

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

// Démarre une tournée : ligne minimale (statut + secteur par défaut), le
// reste est renseigné à la fin (completeTournee). Peut être appelée
// plusieurs fois par jour (une par tournée).
export async function startTournee(): Promise<DailyEntryFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("default_sector_id")
    .eq("id", user.id)
    .single<{ default_sector_id: string | null }>();

  const today = new Date().toISOString().slice(0, 10);
  const defaultSectorId = profile?.default_sector_id ?? null;

  const payload: DailyEntryInsert = {
    driver_id: user.id,
    entry_date: today,
    status: "in_progress",
    started_at: new Date().toISOString(),
    sector_id: defaultSectorId,
  };

  const { data, error } = await supabase
    .from("daily_entries")
    .insert(payload)
    .select()
    .single<DailyEntry>();

  if (error) {
    return { error: error.message };
  }

  // Reflète automatiquement la tournée dans le calendrier (accès étroit :
  // le chauffeur ne peut upserter que sa propre ligne du jour, en tournee).
  await supabase
    .from("schedule")
    .upsert(
      { driver_id: user.id, date: today, type: "tournee", sector_id: defaultSectorId },
      { onConflict: "driver_id,date" },
    );

  revalidatePath("/chauffeur");
  return { error: null, entry: data };
}

export async function completeTournee(
  _prevState: DailyEntryFormState,
  formData: FormData,
): Promise<DailyEntryFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const entryId = textOrNull(formData.get("entry_id"));
  const sectorId = textOrNull(formData.get("sector_id"));
  const tourneeType = formData.get("tournee_type") as TourneeType;
  const vehicleRegistration = textOrNull(formData.get("vehicle_registration"));
  const kmDepart = intOrNull(formData.get("km_depart"));
  const kmArrivee = intOrNull(formData.get("km_arrivee"));

  if (!entryId) return { error: "Tournée introuvable." };
  if (!sectorId) return { error: "Sélectionne un secteur." };
  if (!["journee", "matin", "apres_midi"].includes(tourneeType)) {
    return { error: "Sélectionne le type de tournée." };
  }
  if (!vehicleRegistration) {
    return { error: "L'immatriculation du véhicule est obligatoire." };
  }
  if (kmDepart === null || kmArrivee === null) {
    return { error: "Le kilométrage départ et retour sont obligatoires." };
  }
  if (kmArrivee < kmDepart) {
    return { error: "Le kilométrage retour doit être supérieur ou égal au départ." };
  }

  const { data, error } = await supabase
    .from("daily_entries")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
      tournee_type: tourneeType,
      sector_id: sectorId,
      vehicle_registration: vehicleRegistration,
      km_depart: kmDepart,
      km_arrivee: kmArrivee,
      poses_delivered: intOrNull(formData.get("poses_delivered")),
      poses_damaged: intOrNull(formData.get("poses_damaged")),
      poses_not_delivered: intOrNull(formData.get("poses_not_delivered")),
      poses_enlevement: intOrNull(formData.get("poses_enlevement")),
      courses: textOrNull(formData.get("courses")),
      anomalie_tournee: textOrNull(formData.get("anomalie_tournee")),
      anomalie_vehicule: textOrNull(formData.get("anomalie_vehicule")),
    })
    .eq("id", entryId)
    .eq("driver_id", user.id)
    .select()
    .single<DailyEntry>();

  if (error) {
    return { error: error.message };
  }

  // Mémorise le choix pour préremplir la prochaine tournée, s'il a changé.
  const { data: profile } = await supabase
    .from("profiles")
    .select("default_sector_id")
    .eq("id", user.id)
    .single<{ default_sector_id: string | null }>();

  if (profile && profile.default_sector_id !== sectorId) {
    await supabase.from("profiles").update({ default_sector_id: sectorId }).eq("id", user.id);
  }

  await supabase
    .from("schedule")
    .upsert(
      { driver_id: user.id, date: data.entry_date, type: "tournee", sector_id: sectorId },
      { onConflict: "driver_id,date" },
    );

  revalidatePath("/chauffeur");
  revalidatePath("/chauffeur/historique");
  revalidatePath("/chauffeur/statistiques");
  revalidatePath("/patron/rentabilite");
  return { error: null, entry: data };
}
