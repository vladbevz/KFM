import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { ChauffeurNav } from "@/components/ChauffeurNav";

export default async function ChauffeurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (profile.role !== "driver") redirect("/patron");

  // Défense en profondeur : le compte désactivé est banni côté auth.users
  // (admin-actions.ts), mais une session déjà valide peut survivre jusqu'au
  // prochain refresh de token — on la coupe explicitement ici aussi. Réutilise
  // le "active" déjà chargé par getCurrentProfile() (mémoïsé par requête) au
  // lieu d'une deuxième requête profiles séparée.
  if (!profile.active) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <main className="px-4 py-6 pb-32">{children}</main>
      <ChauffeurNav fullName={profile.full_name} />
    </div>
  );
}
