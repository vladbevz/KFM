"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type NotificationPreferencesUpdate = Database["public"]["Tables"]["notification_preferences"]["Update"];
export type NotificationField = keyof Omit<NotificationPreferencesUpdate, "user_id">;

export interface SubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function saveSubscription(subscription: SubscriptionInput): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "user_id,endpoint" },
  );
  if (error) return { error: error.message };

  // Préférences par défaut (toutes activées) si le patron n'en a pas encore
  // — insert silencieux, ignoré s'il existe déjà une ligne.
  await supabase.from("notification_preferences").upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });

  revalidatePath("/patron/notifications");
  return { error: null };
}

export async function removeSubscription(endpoint: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);
  if (error) return { error: error.message };

  revalidatePath("/patron/notifications");
  return { error: null };
}

export async function updateNotificationPreference(
  field: NotificationField,
  value: boolean,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const payload: NotificationPreferencesUpdate & { user_id: string } = { user_id: user.id };
  payload[field] = value;

  const { error } = await supabase.from("notification_preferences").upsert(payload, { onConflict: "user_id" });
  if (error) return { error: error.message };

  revalidatePath("/patron/notifications");
  return { error: null };
}
