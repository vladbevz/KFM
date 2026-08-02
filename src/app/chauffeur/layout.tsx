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

  const supabase = await createClient();
  const { data: activeCheck } = await supabase
    .from("profiles")
    .select("active")
    .eq("id", profile.id)
    .single<{ active: boolean }>();

  // Défense en profondeur : le compte désactivé est banni côté auth.users
  // (admin-actions.ts), mais une session déjà valide peut survivre jusqu'au
  // prochain refresh de token — on la coupe explicitement ici aussi.
  if (activeCheck && !activeCheck.active) {
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
