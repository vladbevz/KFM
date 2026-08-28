import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEcheanceBuckets } from "@/lib/echeances";
import { notifyBoss } from "@/lib/push";

export const dynamic = "force-dynamic";

// Job quotidien (Vercel Cron, cf. vercel.json) : pas de vérification en
// temps réel à chaque page vue (cf. demande explicite) — une seule passe par
// jour qui pousse un résumé (pas une notification par document, pour éviter
// le spam si plusieurs échéances tombent le même jour).
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { approaching, overdue } = await getEcheanceBuckets(admin, 7);

  if (approaching.length > 0) {
    await notifyBoss("echeance_proche", {
      title: "Échéance qui approche",
      body: `${approaching.length} document(s) arrivent à échéance sous 7 jours.`,
      url: "/patron/echeances",
    });
  }

  if (overdue.length > 0) {
    await notifyBoss("echeance_depassee", {
      title: "Échéance dépassée",
      body: `${overdue.length} document(s) sont déjà expirés.`,
      url: "/patron/echeances",
    });
  }

  return NextResponse.json({ approaching: approaching.length, overdue: overdue.length });
}
