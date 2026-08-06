"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database, EntryStatus, TourneeType } from "@/types/database";

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

// Démarre une tournée : le secteur, le km au compteur et le véhicule sont
// connus du chauffeur à ce moment-là (pas à la fin) — c'est le correctif du
// flux précédent qui les redemandait à tort à la fin. Peut être appelée
// plusieurs fois par jour (une par tournée).
export async function startTournee(
  sectorId: string,
  kmDepart: number,
  vehicleRegistration: string,
): Promise<DailyEntryFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  if (!sectorId) return { error: "Sélectionne un secteur." };
  if (!Number.isFinite(kmDepart) || kmDepart < 0) {
    return { error: "Le kilométrage au compteur est obligatoire." };
  }
  const immat = vehicleRegistration.trim();
  if (!immat) return { error: "L'immatriculation du véhicule est obligatoire." };

  const today = new Date().toISOString().slice(0, 10);

  const payload: DailyEntryInsert = {
    driver_id: user.id,
    entry_date: today,
    status: "in_progress",
    started_at: new Date().toISOString(),
    sector_id: sectorId,
    km_depart: Math.trunc(kmDepart),
    vehicle_registration: immat,
  };

  const { data, error } = await supabase
    .from("daily_entries")
    .insert(payload)
    .select()
    .single<DailyEntry>();

  if (error) {
    return { error: error.message };
  }

  // Mémorise le choix pour préremplir la prochaine tournée, s'il a changé.
  const [{ data: profile }, { data: vehicle }] = await Promise.all([
    supabase
      .from("profiles")
      .select("default_sector_id, default_vehicle_id")
      .eq("id", user.id)
      .single<{ default_sector_id: string | null; default_vehicle_id: string | null }>(),
    supabase
      .from("vehicles")
      .select("id")
      .eq("plate", immat)
      .eq("retired", false)
      .maybeSingle<{ id: string }>(),
  ]);

  const profileUpdate: Database["public"]["Tables"]["profiles"]["Update"] = {};
  if (profile && profile.default_sector_id !== sectorId) {
    profileUpdate.default_sector_id = sectorId;
  }
  if (profile && vehicle && profile.default_vehicle_id !== vehicle.id) {
    profileUpdate.default_vehicle_id = vehicle.id;
  }
  if (Object.keys(profileUpdate).length > 0) {
    await supabase.from("profiles").update(profileUpdate).eq("id", user.id);
  }

  // Reflète automatiquement la tournée dans le calendrier (accès étroit :
  // le chauffeur ne peut upserter que sa propre ligne du jour, en tournee).
  await supabase
    .from("schedule")
    .upsert(
      { driver_id: user.id, date: today, type: "tournee", sector_id: sectorId },
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
  const tourneeType = formData.get("tournee_type") as TourneeType;
  const kmArrivee = intOrNull(formData.get("km_arrivee"));

  if (!entryId) return { error: "Tournée introuvable." };
  if (!["journee", "demi_journee"].includes(tourneeType)) {
    return { error: "Sélectionne le type de tournée." };
  }
  if (kmArrivee === null) {
    return { error: "Le kilométrage retour est obligatoire." };
  }

  // Le secteur, l'immatriculation et le km de départ sont déjà en base
  // depuis le démarrage de la tournée (startTournee) — on ne redemande que
  // ce qui n'est connu qu'à la fin.
  const { data: existing, error: fetchError } = await supabase
    .from("daily_entries")
    .select("km_depart")
    .eq("id", entryId)
    .eq("driver_id", user.id)
    .single<{ km_depart: number | null }>();

  if (fetchError || !existing) return { error: "Tournée introuvable." };
  if (existing.km_depart !== null && kmArrivee < existing.km_depart) {
    return { error: "Le kilométrage retour doit être supérieur ou égal au départ." };
  }

  const { data, error } = await supabase
    .from("daily_entries")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
      tournee_type: tourneeType,
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

  revalidatePath("/chauffeur");
  revalidatePath("/chauffeur/historique");
  revalidatePath("/chauffeur/statistiques");
  revalidatePath("/patron/rentabilite");
  return { error: null, entry: data };
}

// Correction d'une tournée déjà terminée, réservée au jour même : la RLS
// (daily_entries_update_own_within_24h) l'autorise déjà techniquement
// jusqu'à 24h après created_at, mais on restreint explicitement ici à
// entry_date === aujourd'hui pour ne jamais permettre de retoucher un
// historique déjà consulté par le patron.
export async function updateTournee(
  _prevState: DailyEntryFormState,
  formData: FormData,
): Promise<DailyEntryFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const entryId = textOrNull(formData.get("entry_id"));
  const tourneeType = formData.get("tournee_type") as TourneeType;
  const kmDepart = intOrNull(formData.get("km_depart"));
  const kmArrivee = intOrNull(formData.get("km_arrivee"));

  if (!entryId) return { error: "Tournée introuvable." };
  if (!["journee", "demi_journee"].includes(tourneeType)) {
    return { error: "Sélectionne le type de tournée." };
  }
  if (kmDepart === null) {
    return { error: "Le kilométrage au compteur est obligatoire." };
  }
  if (kmArrivee === null) {
    return { error: "Le kilométrage retour est obligatoire." };
  }
  if (kmArrivee < kmDepart) {
    return { error: "Le kilométrage retour doit être supérieur ou égal au départ." };
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: existing, error: fetchError } = await supabase
    .from("daily_entries")
    .select("entry_date, status")
    .eq("id", entryId)
    .eq("driver_id", user.id)
    .single<{ entry_date: string; status: EntryStatus }>();

  if (fetchError || !existing) return { error: "Tournée introuvable." };
  if (existing.status !== "completed") {
    return { error: "Cette tournée n'est pas encore terminée." };
  }
  if (existing.entry_date !== today) {
    return { error: "Seule la tournée du jour même peut être modifiée." };
  }

  const { data, error } = await supabase
    .from("daily_entries")
    .update({
      tournee_type: tourneeType,
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

  revalidatePath("/chauffeur");
  revalidatePath("/chauffeur/historique");
  revalidatePath("/chauffeur/statistiques");
  revalidatePath("/patron/rentabilite");
  return { error: null, entry: data };
}
