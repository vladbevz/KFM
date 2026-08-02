"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface DriverActionState {
  error: string | null;
}

function textOrNull(value: FormDataEntryValue | null): string | null {
  const str = (value as string | null)?.trim();
  return str ? str : null;
}

// Seule protection de ces actions : le service role bypass RLS entièrement,
// donc la vérification du rôle doit se faire ici, en application, avant
// tout appel au client admin — pas de filet de sécurité côté base.
async function verifyBoss(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Non authentifié." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (profile?.role !== "boss") return { error: "Non autorisé." };
  return { error: null };
}

export async function createDriver(
  _prevState: DriverActionState,
  formData: FormData,
): Promise<DriverActionState> {
  const auth = await verifyBoss();
  if (auth.error) return { error: auth.error };

  const fullName = textOrNull(formData.get("full_name"));
  const email = textOrNull(formData.get("email"));
  const password = textOrNull(formData.get("password"));

  if (!fullName) return { error: "Le nom complet est obligatoire." };
  if (!email) return { error: "L'email est obligatoire." };
  if (!password || password.length < 8) {
    return { error: "Le mot de passe doit faire au moins 8 caractères." };
  }

  const admin = createAdminClient();

  // Le trigger on_auth_user_created (schema.sql) crée automatiquement la
  // ligne profiles (role='driver', active=true par défaut) à partir de
  // user_metadata.full_name — pas d'insert manuel nécessaire.
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) return { error: error.message };

  revalidatePath("/patron/chauffeurs");
  return { error: null };
}

export async function setDriverActive(driverId: string, active: boolean): Promise<DriverActionState> {
  const auth = await verifyBoss();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();

  // Bannissement long plutôt que suppression : réversible, l'historique du
  // chauffeur (daily_entries, fuel_logs, vehicle_issues...) reste intact.
  const { error: banError } = await admin.auth.admin.updateUserById(driverId, {
    ban_duration: active ? "none" : "876000h",
  });
  if (banError) return { error: banError.message };

  const { error } = await admin.from("profiles").update({ active }).eq("id", driverId);
  if (error) return { error: error.message };

  revalidatePath("/patron/chauffeurs");
  revalidatePath(`/patron/chauffeurs/${driverId}`);
  return { error: null };
}
