import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single<Profile>();

  return profile;
}
