import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { ChauffeurNav } from "@/components/ChauffeurNav";

export default async function ChauffeurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (profile.role !== "driver") redirect("/patron");

  return (
    <div className="min-h-screen">
      <main className="px-4 py-6 pb-32">{children}</main>
      <ChauffeurNav fullName={profile.full_name} />
    </div>
  );
}
