import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  active: boolean;
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

// Mémoïsé par requête pour la même raison que getAuthUser ci-dessus : le
// layout chauffeur et plusieurs pages (ex. Saisie) appellent chacun
// getCurrentProfile() — sans cache(), c'est une requête profiles en plus à
// chaque navigation, en plus de celle déjà comptée dans getAuthUser.
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, active")
    .eq("id", user.id)
    .single<Profile>();

  return profile;
});
