import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationType =
  | "panne_signalee"
  | "echeance_proche"
  | "echeance_depassee"
  | "demande_conge";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

let vapidConfigured = false;
function ensureVapidConfigured() {
  if (vapidConfigured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  vapidConfigured = true;
}

// Envoie une notification push à tous les patrons (role = 'boss') ayant
// activé `type` dans leurs préférences — jamais appelé depuis le client, la
// clé VAPID privée ne doit exister que côté serveur (cf. lib/supabase/admin.ts
// pour le même principe appliqué à la service role key).
export async function notifyBoss(type: NotificationType, payload: PushPayload): Promise<void> {
  ensureVapidConfigured();
  const admin = createAdminClient();

  const { data: bosses } = await admin.from("profiles").select("id").eq("role", "boss");
  const bossIds = (bosses ?? []).map((b) => b.id);
  if (bossIds.length === 0) return;

  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("user_id, panne_signalee, echeance_proche, echeance_depassee, demande_conge")
    .in("user_id", bossIds);

  // Pas de ligne préférences = valeurs par défaut de la table (true) : un
  // patron qui n'a jamais ouvert l'écran Notifications reste notifié tant
  // qu'il n'a pas explicitement désactivé un type.
  const enabledBossIds = bossIds.filter((id) => {
    const pref = prefs?.find((p) => p.user_id === id);
    return pref ? pref[type] : true;
  });
  if (enabledBossIds.length === 0) return;

  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", enabledBossIds);
  if (!subscriptions || subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Abonnement expiré/révoqué côté navigateur — on le retire pour ne
          // pas retenter indéfiniment un endpoint mort.
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }),
  );
}
