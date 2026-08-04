import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { REMEMBER_COOKIE_NAME, REMEMBER_COOKIE_MAX_AGE } from "@/lib/supabase/remember";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // Le refresh automatique du token est déjà assuré côté serveur par le
    // middleware (supabase.auth.getUser() sur quasi toute requête) via de
    // vrais headers Set-Cookie. Le désactiver ici évite que le SDK réécrive
    // le cookie via document.cookie en arrière-plan : ces écritures sont (a)
    // plafonnées à 7 jours par l'ITP de Safari/iOS (pertinent en PWA
    // installée) et (b) toujours réécrites avec le maxAge par défaut de
    // ~400 jours par @supabase/ssr, ce qui annulait silencieusement le choix
    // "Se souvenir de moi" décoché dès le premier refresh en arrière-plan.
    { auth: { autoRefreshToken: false } },
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

// Marqueur lu côté serveur (middleware.ts, server.ts) pour rétablir un
// cookie de session à chaque refresh automatique du token quand "Se
// souvenir de moi" est décoché — sans ce marqueur, le refresh serveur
// réécrirait le cookie avec le maxAge par défaut (~400 jours) du SDK.
export function setRememberPreference(remember: boolean) {
  if (typeof document === "undefined") return;
  document.cookie = `${REMEMBER_COOKIE_NAME}=${remember ? "1" : "0"}; path=/; max-age=${REMEMBER_COOKIE_MAX_AGE}; samesite=lax`;
}

export function clearRememberPreference() {
  if (typeof document === "undefined") return;
  document.cookie = `${REMEMBER_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
}
