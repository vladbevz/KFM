import { createClient } from "@/lib/supabase/server";
import { NotificationSubscribeButton } from "@/components/NotificationSubscribeButton";
import { NotificationPreferenceToggles } from "@/components/NotificationPreferenceToggles";
import type { NotificationField } from "@/app/patron/notifications/actions";
import type { Database } from "@/types/database";

type NotificationPreferences = Database["public"]["Tables"]["notification_preferences"]["Row"];

const DEFAULT_PREFERENCES: Record<NotificationField, boolean> = {
  panne_signalee: true,
  echeance_proche: true,
  echeance_depassee: true,
  demande_conge: true,
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: prefs } = user
    ? await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle<NotificationPreferences>()
    : { data: null };

  const preferences: Record<NotificationField, boolean> = prefs
    ? {
        panne_signalee: prefs.panne_signalee,
        echeance_proche: prefs.echeance_proche,
        echeance_depassee: prefs.echeance_depassee,
        demande_conge: prefs.demande_conge,
      }
    : DEFAULT_PREFERENCES;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">Notifications</h1>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface shadow-card p-4">
        <p className="text-sm text-foreground-muted">
          Reçois une notification directement sur cet appareil pour les événements ci-dessous, sans avoir à
          parcourir l&apos;application.
        </p>
        <NotificationSubscribeButton />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground/80">Types d&apos;événements</h2>
        <NotificationPreferenceToggles preferences={preferences} />
      </div>
    </div>
  );
}
