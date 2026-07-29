import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// @supabase/ssr toujours écrit les cookies d'auth avec son propre maxAge par
// défaut (~400 jours) : la lib ignore silencieusement tout cookieOptions.maxAge
// personnalisé passé à createBrowserClient (vérifié dans ses sources — le
// setItem interne réécrit maxAge avec sa valeur par défaut à chaque écriture).
// "Se souvenir de moi" décoché ne peut donc pas passer par cette option ; on
// réécrit nous-mêmes les cookies juste après la connexion pour en faire des
// cookies de session (sans Max-Age/Expires -> effacés à la fermeture du
// navigateur), en conservant leur valeur exacte telle qu'écrite par le SDK.
export function downgradeAuthCookiesToSession() {
  if (typeof document === "undefined") return;

  for (const pair of document.cookie.split("; ")) {
    const eqIndex = pair.indexOf("=");
    if (eqIndex === -1) continue;
    const name = pair.slice(0, eqIndex);
    const value = pair.slice(eqIndex + 1);
    if (!name.startsWith("sb-") || !name.includes("auth-token")) continue;
    document.cookie = `${name}=${value}; path=/; samesite=lax`;
  }
}
