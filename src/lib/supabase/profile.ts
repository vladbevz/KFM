import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
}

// Mémoïsé par requête : le layout et la page appellent tous les deux
// l'utilisateur courant, sans ce cache() chacun déclencherait son propre
// aller-retour réseau vers Supabase Auth pour le même token.
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single<Profile>();

  return profile;
}
