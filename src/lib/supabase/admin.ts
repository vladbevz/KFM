import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Client "admin" avec la service role key — bypass RLS entièrement, requis
// pour les opérations sur auth.users (création/désactivation de comptes).
// Ne JAMAIS importer ce module depuis un composant client : la clé service
// role vit uniquement dans une variable d'environnement serveur (pas de
// préfixe NEXT_PUBLIC_, donc jamais inlinée dans un bundle navigateur) —
// seuls les fichiers "use server" (admin-actions.ts) importent ce module.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
