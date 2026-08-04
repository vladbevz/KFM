import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { REMEMBER_COOKIE_NAME } from "@/lib/supabase/remember";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            // Cf. middleware.ts : rabat les cookies auth en cookies de
            // session quand "Se souvenir de moi" est décoché, sinon
            // @supabase/ssr repart sur son maxAge par défaut (~400 jours)
            // à chaque refresh.
            const remembered = cookieStore.get(REMEMBER_COOKIE_NAME)?.value !== "0";
            cookiesToSet.forEach(({ name, value, options }) => {
              const isAuthToken = name.startsWith("sb-") && name.includes("auth-token");
              const finalOptions =
                isAuthToken && !remembered
                  ? { ...options, maxAge: undefined, expires: undefined }
                  : options;
              cookieStore.set(name, value, finalOptions);
            });
          } catch {
            // setAll appelé depuis un Server Component : ignoré si le
            // middleware rafraîchit déjà la session utilisateur.
          }
        },
      },
    },
  );
}
