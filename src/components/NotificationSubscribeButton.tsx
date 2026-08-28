"use client";

import { useEffect, useState, useTransition } from "react";
import { BellOff, BellRing, Loader2 } from "lucide-react";
import { saveSubscription, removeSubscription } from "@/app/patron/notifications/actions";

type State = "checking" | "unsupported" | "subscribed" | "unsubscribed" | "denied";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function NotificationSubscribeButton() {
  const [state, setState] = useState<State>("checking");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => setState(sub ? "subscribed" : "unsubscribed"))
      .catch(() => setState("unsubscribed"));
  }, []);

  function activate() {
    setError(null);
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setError("Configuration des notifications manquante.");
      return;
    }
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
        const json = subscription.toJSON();
        const result = await saveSubscription({
          endpoint: json.endpoint!,
          keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        setState("subscribed");
      } catch (err) {
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          setState("denied");
        } else {
          setError("Impossible d'activer les notifications.");
        }
      }
    });
  }

  function deactivate() {
    setError(null);
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const endpoint = subscription.endpoint;
          await subscription.unsubscribe();
          await removeSubscription(endpoint);
        }
        setState("unsubscribed");
      } catch {
        setError("Impossible de désactiver les notifications.");
      }
    });
  }

  if (state === "checking") return null;

  if (state === "unsupported") {
    return (
      <p className="text-sm text-foreground-muted">
        Les notifications push ne sont pas disponibles sur ce navigateur.
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="text-sm text-destructive">
        Notifications refusées par le navigateur. Autorise-les dans les réglages du site pour les activer.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {state === "unsubscribed" ? (
        <button
          type="button"
          onClick={activate}
          disabled={pending}
          className="flex items-center justify-center gap-2 rounded-md bg-km px-4 py-3 text-sm font-semibold text-accent-ink disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" strokeWidth={1.8} />}
          Activer les notifications
        </button>
      ) : (
        <button
          type="button"
          onClick={deactivate}
          disabled={pending}
          className="flex items-center justify-center gap-2 rounded-md border border-border px-4 py-3 text-sm font-medium text-foreground disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" strokeWidth={1.8} />}
          Désactiver les notifications
        </button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
