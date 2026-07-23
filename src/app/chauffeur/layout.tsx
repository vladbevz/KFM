import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { LogoutButton } from "@/components/LogoutButton";
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
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {profile.full_name}
          </p>
          <p className="text-xs text-foreground/50">Chauffeur</p>
        </div>
        <LogoutButton />
      </header>
      <main className="px-4 py-6 pb-32">{children}</main>
      <ChauffeurNav />
    </div>
  );
}
