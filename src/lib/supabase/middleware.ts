import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { REMEMBER_COOKIE_NAME } from "@/lib/supabase/remember";

function redirectTo(
  request: NextRequest,
  pathname: string,
  supabaseResponse: NextResponse,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  const redirectResponse = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          // "Se souvenir de moi" décoché : @supabase/ssr réécrit toujours le
          // cookie avec son maxAge par défaut (~400 jours) à chaque refresh,
          // y compris ici. On le rabat en cookie de session (sans
          // maxAge/expires) pour respecter le choix fait à la connexion.
          const remembered = request.cookies.get(REMEMBER_COOKIE_NAME)?.value !== "0";
          cookiesToSet.forEach(({ name, value, options }) => {
            const isAuthToken = name.startsWith("sb-") && name.includes("auth-token");
            const finalOptions =
              isAuthToken && !remembered
                ? { ...options, maxAge: undefined, expires: undefined }
                : options;
            supabaseResponse.cookies.set(name, value, finalOptions);
          });
        },
      },
    },
  );

  // Rafraîchit la session avant chaque rendu de Server Component.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtectedRoute =
    pathname.startsWith("/chauffeur") || pathname.startsWith("/patron");
  const isLoginRoute = pathname === "/login";

  if (!user && isProtectedRoute) {
    return redirectTo(request, "/login", supabaseResponse);
  }

  if (user && isLoginRoute) {
    return redirectTo(request, "/", supabaseResponse);
  }

  return supabaseResponse;
}
