import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { PatronNav } from "@/components/PatronNav";

export default async function PatronLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (profile.role !== "boss") redirect("/chauffeur");

  return (
    <div className="min-h-screen">
      <PatronNav fullName={profile.full_name} />
      <main className="px-4 py-6">{children}</main>
    </div>
  );
}
